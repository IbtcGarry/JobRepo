import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  resource,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';

import { PlaceResult, googleMapsUrl, searchPlaces } from '../../core/geocode';
import { JobService } from '../../core/job.service';
import { salaryRange } from '../../data/job-format';
import { JobFilters, activeFilterCount, filterJobs } from '../../data/job-filters';
import { Job } from '../../data/jobs';
import {
  Bounds,
  PinGroup,
  Place,
  RADIUS_OPTIONS,
  distanceMiles,
  formatMiles,
  groupByPlace,
  hasCoords,
  inBounds,
  pinLabel,
} from '../../data/geo';
import { MapSearch, searchFromParams, searchToParams } from '../../data/map-search';
import { JobCard } from '../../shared/job-card';
import { JobFilterBar } from '../../shared/job-filter-bar';

interface Row {
  job: Job;
  miles: number | null;
}

/** Pins closer than this many screen pixels merge into a numbered cluster. */
const CLUSTER_PX = 44;
const DEFAULT_VIEW = { lat: 39.5, lng: -98.35, zoom: 4 };

/**
 * Apartment-site style job search (`/map`): list and map side by side, salary "price tag" pins,
 * place search, my location, distance radius, "search as I move the map", and the board's filters.
 * The whole search lives in the URL so it can be shared.
 */
@Component({
  selector: 'app-jobs-map',
  imports: [RouterLink, FormsModule, JobCard, JobFilterBar],
  templateUrl: './jobs-map.html',
  host: { class: 'map-host' },
})
export class JobsMap implements AfterViewInit {
  private readonly jobService = inject(JobService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly listEl = viewChild<ElementRef<HTMLElement>>('list');

  protected readonly radiusOptions = RADIUS_OPTIONS;
  protected readonly formatMiles = formatMiles;

  // --- Search state (mirrored to the URL) ---
  protected readonly search = signal<MapSearch>(searchFromParams(this.route.snapshot.queryParams));
  protected readonly filters = computed(() => this.search().filters);

  // --- Map state ---
  private map?: L.Map;
  private pinLayer = L.layerGroup();
  private radiusLayer = L.layerGroup();
  private markers = new Map<string, { marker: L.Marker; jobIds: string[]; count: number; label: string; cluster: boolean }>();
  /** Bounds the list is limited to; null until the map is ready. */
  protected readonly bounds = signal<Bounds | null>(null);
  /** When off, moving the map shows a "Search this area" button instead of updating the list. */
  protected readonly followMap = signal(true);
  protected readonly movedSinceSearch = signal(false);
  protected readonly zoom = signal(DEFAULT_VIEW.zoom);

  // --- UI state ---
  protected readonly hoveredId = signal<string | null>(null);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly mobileView = signal<'list' | 'map'>('list');
  protected placeQuery = this.search().near?.label ?? '';
  protected readonly placeResults = signal<PlaceResult[]>([]);
  protected readonly placeBusy = signal(false);
  protected readonly placeError = signal('');

  // --- Data ---
  protected readonly jobs = resource({ loader: () => this.jobService.list() });

  /** The parts of the search that change results; panning the map (view) doesn't, so pins and popups stay put. */
  private readonly criteria = computed(
    () => {
      const { filters, near, radius } = this.search();
      return { filters, near, radius };
    },
    { equal: (a, b) => a.filters === b.filters && a.near === b.near && a.radius === b.radius },
  );

  /** Jobs passing the filters and radius (anywhere on the map). */
  protected readonly matches = computed<Row[]>(() => {
    const { filters, near, radius } = this.criteria();
    const placed = (this.jobs.value() ?? []).filter(hasCoords);
    const filtered = filterJobs(placed, { ...filters, location: '', sort: filters.sort === 'distance' ? 'newest' : filters.sort });
    const rows = filtered.map((job) => ({ job, miles: near ? distanceMiles(near, job as Job & { lat: number; lng: number }) : null }));
    const inRadius = near && radius ? rows.filter((r) => r.miles! <= radius) : rows;
    return filters.sort === 'distance' && near ? [...inRadius].sort((a, b) => a.miles! - b.miles!) : inRadius;
  });

  /** What the list shows: matches inside the searched map area. */
  protected readonly visible = computed(() => {
    const b = this.bounds();
    return b ? this.matches().filter((r) => inBounds(r.job as Job & { lat: number; lng: number }, b)) : this.matches();
  });

  protected readonly unplacedCount = computed(() => (this.jobs.value() ?? []).filter((j) => !hasCoords(j)).length);
  protected readonly activeCount = computed(() => activeFilterCount(this.filters()) + (this.search().radius ? 1 : 0));

  constructor() {
    // Keep the URL in sync with the search (replaceUrl so Back leaves the map instead of stepping through moves).
    effect(() => {
      const queryParams = searchToParams(this.search());
      untracked(() => void this.router.navigate([], { queryParams, replaceUrl: true }));
    });

    // Redraw pins when results, zoom or highlight change.
    effect(() => {
      this.matches();
      this.zoom();
      untracked(() => this.renderPins());
    });
    effect(() => {
      const hovered = this.hoveredId();
      const selected = this.selectedId();
      untracked(() => this.highlightPins(hovered, selected));
    });

    // Radius circle.
    effect(() => {
      const { near, radius } = this.criteria();
      untracked(() => this.drawRadius(near, radius));
    });

    // First load with no saved view: zoom to fit every matching job.
    effect(() => {
      const rows = this.matches();
      if (!this.jobs.isLoading() && this.map && !this.fittedOnce) {
        this.fittedOnce = true;
        untracked(() => {
          if (this.search().view || this.search().near) return;
          this.fitTo(rows.map((r) => r.job));
        });
      }
    });
  }

  private fittedOnce = false;
  /** A fit requested while the map was hidden (phone list view); done once it's shown. */
  private pendingFit: Job[] | null = null;

  ngAfterViewInit() {
    const s = this.search();
    const view = s.view ?? (s.near ? { lat: s.near.lat, lng: s.near.lng, zoom: 11 } : DEFAULT_VIEW);
    const map = (this.map = L.map(this.mapEl().nativeElement, { worldCopyJump: true, zoomControl: false }).setView(
      [view.lat, view.lng],
      view.zoom,
    ));
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    this.radiusLayer.addTo(map);
    this.pinLayer.addTo(map);

    map.on('moveend', () => this.onMoveEnd());
    map.on('click', () => this.selectedId.set(null));
    this.applyBounds();
    this.zoom.set(map.getZoom());
    this.renderPins();
    this.drawRadius(s.near, s.radius);

    // The map container changes size when the mobile List/Map toggle or the window changes.
    const resize = new ResizeObserver(() => {
      map.invalidateSize();
      if (this.pendingFit && this.mapEl().nativeElement.clientWidth > 0) {
        const jobs = this.pendingFit;
        this.pendingFit = null;
        this.fitTo(jobs);
      }
    });
    resize.observe(this.mapEl().nativeElement);
    this.destroyRef.onDestroy(() => {
      resize.disconnect();
      map.remove();
    });
  }

  // ---------- Search controls ----------

  protected setFilters(filters: JobFilters) {
    this.search.update((s) => ({ ...s, filters }));
  }

  protected setSort(sort: JobFilters['sort']) {
    this.search.update((s) => ({ ...s, filters: { ...s.filters, sort } }));
  }

  protected setQuery(query: string) {
    this.search.update((s) => ({ ...s, filters: { ...s.filters, query } }));
  }

  protected setRadius(radius: number) {
    this.search.update((s) => ({ ...s, radius }));
    const near = this.search().near;
    if (near && radius) this.map?.fitBounds(L.latLng(near.lat, near.lng).toBounds(radius * 1609.34 * 2), { padding: [20, 20] });
  }

  async findPlace() {
    this.placeError.set('');
    this.placeResults.set([]);
    if (!this.placeQuery.trim()) return this.clearPlace();
    this.placeBusy.set(true);
    try {
      const results = await searchPlaces(this.placeQuery);
      if (!results.length) this.placeError.set('No places found. Try a city, ZIP code or address.');
      else if (results.length === 1 || results[0].label.toLowerCase().startsWith(this.placeQuery.trim().toLowerCase())) this.goTo(results[0]);
      else this.placeResults.set(results);
    } catch (err) {
      this.placeError.set(err instanceof Error ? err.message : 'Place search failed.');
    } finally {
      this.placeBusy.set(false);
    }
  }

  protected goTo(place: PlaceResult) {
    this.placeResults.set([]);
    this.placeQuery = place.label;
    this.setNear({ label: place.label, lat: place.lat, lng: place.lng });
    const radius = this.search().radius;
    if (radius) this.setRadius(radius);
    else if (place.bbox) {
      const [s, n, w, e] = place.bbox;
      this.map?.fitBounds([[s, w], [n, e]], { maxZoom: 13 });
    } else this.map?.setView([place.lat, place.lng], 12);
  }

  protected useMyLocation() {
    this.placeError.set('');
    if (!('geolocation' in navigator)) return this.placeError.set('Your browser can’t share its location.');
    this.placeBusy.set(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.placeBusy.set(false);
        this.goTo({ label: 'Your location', lat: coords.latitude, lng: coords.longitude, bbox: null });
      },
      () => {
        this.placeBusy.set(false);
        this.placeError.set('Couldn’t get your location. Check that location access is allowed for this site.');
      },
      { timeout: 10000 },
    );
  }

  protected clearPlace() {
    this.placeQuery = '';
    this.placeResults.set([]);
    this.search.update((s) => ({
      ...s,
      near: null,
      radius: 0,
      filters: s.filters.sort === 'distance' ? { ...s.filters, sort: 'newest' } : s.filters,
    }));
  }

  private setNear(near: Place) {
    // Measuring from a place makes "closest first" the natural order.
    this.search.update((s) => ({ ...s, near, filters: { ...s.filters, sort: 'distance' } }));
  }

  protected toggleFollow(on: boolean) {
    this.followMap.set(on);
    if (on) this.applyBounds();
  }

  /** "Search this area": limit the list to what's on screen now. */
  protected applyBounds() {
    // A hidden map (phone list view) has no real area; keep showing every match until it's visible.
    if (!this.map || this.mapEl().nativeElement.clientWidth === 0) return;
    const b = this.map.getBounds();
    this.bounds.set({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
    this.movedSinceSearch.set(false);
  }

  protected showAll() {
    this.fitTo(this.matches().map((r) => r.job));
  }

  protected clearEverything() {
    this.clearPlace();
    this.search.update((s) => ({ ...s, filters: { ...s.filters, query: '' } }));
    this.setFilters({ ...this.filters(), roles: [], workplaces: [], types: [], levels: [], sizes: [], minSalary: 0, skills: [], postedWithinDays: 0, equityOnly: false, visaOnly: false });
  }

  // ---------- List <-> map interaction ----------

  protected hover(jobId: string | null) {
    this.hoveredId.set(jobId);
  }

  /** Clicking a card's map button pans to its pin and opens it. */
  protected locate(row: Row) {
    const job = row.job;
    if (!hasCoords(job) || !this.map) return;
    this.selectedId.set(job.id);
    this.mobileView.set('map');
    this.map.setView([job.lat, job.lng], Math.max(this.map.getZoom(), 14));
    setTimeout(() => this.openPopupFor(job.id), 350);
  }

  private onMoveEnd() {
    const map = this.map!;
    const c = map.getCenter();
    this.zoom.set(map.getZoom());
    this.search.update((s) => ({ ...s, view: { lat: c.lat, lng: c.lng, zoom: map.getZoom() } }));
    if (this.followMap()) this.applyBounds();
    else this.movedSinceSearch.set(true);
  }

  private fitTo(jobs: Job[]) {
    const pts = jobs.filter(hasCoords).map((j) => L.latLng(j.lat, j.lng));
    if (!this.map || !pts.length) return;
    if (this.mapEl().nativeElement.clientWidth === 0) {
      // Fitting a hidden map gives the wrong zoom; wait until it's visible.
      this.pendingFit = jobs;
      return;
    }
    if (pts.length === 1) this.map.setView(pts[0], 12);
    else this.map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 13 });
  }

  private scrollToCard(jobId: string) {
    const card = this.listEl()?.nativeElement.querySelector<HTMLElement>(`[data-job="${jobId}"]`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ---------- Pins ----------

  /** Merge nearby places into clusters at the current zoom, then draw price-tag pins. */
  private renderPins() {
    const map = this.map;
    if (!map) return;
    this.pinLayer.clearLayers();
    this.markers.clear();

    const groups = groupByPlace(this.matches().map((r) => r.job));
    const clusters: { groups: PinGroup[]; point: L.Point }[] = [];
    for (const group of groups) {
      const point = map.project([group.lat, group.lng], map.getZoom());
      const near = clusters.find((c) => c.point.distanceTo(point) < CLUSTER_PX);
      if (near) near.groups.push(group);
      else clusters.push({ groups: [group], point });
    }

    for (const cluster of clusters) {
      const jobs = cluster.groups.flatMap((g) => g.jobs);
      const isCluster = cluster.groups.length > 1;
      const lat = cluster.groups.reduce((s, g) => s + g.lat, 0) / cluster.groups.length;
      const lng = cluster.groups.reduce((s, g) => s + g.lng, 0) / cluster.groups.length;
      const label = isCluster ? String(jobs.length) : pinLabel(jobs);
      const marker = L.marker([lat, lng], {
        icon: this.pinIcon(label, isCluster, false),
        title: jobs.map((j) => `${j.title} · ${j.company}`).join('\n'),
        riseOnHover: true,
        keyboard: true,
      });
      if (isCluster) {
        marker.on('click', () =>
          map.fitBounds(L.latLngBounds(cluster.groups.map((g) => L.latLng(g.lat, g.lng))), { padding: [60, 60], maxZoom: 16 }),
        );
      } else {
        const group = cluster.groups[0];
        marker.bindPopup(() => this.popup(group), { minWidth: 240, maxWidth: 300, autoPanPadding: [24, 24] });
        marker.on('click', () => {
          this.selectedId.set(group.jobs[0].id);
          this.scrollToCard(group.jobs[0].id);
        });
        marker.on('mouseover', () => this.hoveredId.set(group.jobs[0].id));
        marker.on('mouseout', () => this.hoveredId.set(null));
      }
      marker.addTo(this.pinLayer);
      this.markers.set(jobs[0].id, { marker, jobIds: jobs.map((j) => j.id), count: jobs.length, label, cluster: isCluster });
    }
    this.highlightPins(this.hoveredId(), this.selectedId());
  }

  private highlightPins(hovered: string | null, selected: string | null) {
    for (const m of this.markers.values()) {
      const active = (!!hovered && m.jobIds.includes(hovered)) || (!!selected && m.jobIds.includes(selected));
      m.marker.setIcon(this.pinIcon(m.label, m.cluster, active));
      m.marker.setZIndexOffset(active ? 1000 : 0);
    }
  }

  private openPopupFor(jobId: string) {
    for (const m of this.markers.values()) {
      if (m.jobIds.includes(jobId) && !m.cluster) m.marker.openPopup();
    }
  }

  private pinIcon(label: string, cluster: boolean, active: boolean): L.DivIcon {
    const span = document.createElement('span');
    span.className = `${cluster ? 'cluster-pin' : 'price-pin'}${active ? ' active' : ''}`;
    span.textContent = label;
    // Zero-size icon; the pill centers itself above the point with CSS.
    return L.divIcon({ className: 'pin-anchor', html: span, iconSize: [0, 0], iconAnchor: [0, 0], popupAnchor: [0, -34] });
  }

  private drawRadius(near: Place | null, radius: number) {
    this.radiusLayer.clearLayers();
    if (!near) return;
    L.circleMarker([near.lat, near.lng], { radius: 7, color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 })
      .bindTooltip(near.label)
      .addTo(this.radiusLayer);
    if (radius) {
      L.circle([near.lat, near.lng], {
        radius: radius * 1609.34,
        color: '#2563eb',
        weight: 1.5,
        fillColor: '#2563eb',
        fillOpacity: 0.06,
        interactive: false,
      }).addTo(this.radiusLayer);
    }
  }

  /** Built from DOM nodes (not HTML strings) so job text can't inject markup. */
  private popup(group: PinGroup): HTMLElement {
    const root = el('div', 'map-popup');
    const near = this.search().near;
    for (const job of group.jobs) {
      const item = el('div', 'map-popup-job');
      item.append(el('div', 'map-popup-company', job.company));
      const title = el('a', 'map-popup-title', job.title) as HTMLAnchorElement;
      title.href = `/jobs/${job.id}`;
      title.addEventListener('click', (event) => {
        event.preventDefault();
        void this.router.navigate(['/jobs', job.id]);
      });
      item.append(title);
      const facts = [salaryRange(job), job.workplace, job.type, near ? formatMiles(distanceMiles(near, group)) : null];
      item.append(el('div', 'map-popup-meta', facts.filter(Boolean).join(' · ')));
      root.append(item);
    }
    const maps = el('a', 'map-popup-google', 'Open in Google Maps') as HTMLAnchorElement;
    maps.href = googleMapsUrl(group.jobs[0].address);
    maps.target = '_blank';
    maps.rel = 'noopener';
    root.append(el('div', 'map-popup-address', group.jobs[0].address), maps);
    return root;
  }
}

function el(tag: string, className: string, text = ''): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
