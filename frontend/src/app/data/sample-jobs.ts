// Placeholder listings for the front page, copied from the Lovable mockup.
// Replace with the Appwrite `jobs` table once Steps 4–5 land.
export type JobRole = 'Engineering' | 'Design' | 'Product' | 'Sales' | 'Operations';

export interface Job {
  id: string;
  company: string;
  batch: string;
  tagline: string;
  title: string;
  role: JobRole;
  location: string;
  remote: boolean;
  salary: string;
  equity: string;
  posted: string;
}

export const ROLES: JobRole[] = ['Engineering', 'Design', 'Product', 'Sales', 'Operations'];

export const SAMPLE_JOBS: Job[] = [
  { id: '1', company: 'Tensorloop', batch: 'W26', tagline: 'Inference infra for small teams', title: 'Founding Backend Engineer', role: 'Engineering', location: 'San Francisco, CA', remote: false, salary: '$180K – $230K', equity: '0.5% – 1.5%', posted: '2d ago' },
  { id: '2', company: 'Harvest Health', batch: 'S25', tagline: 'AI scribe for rural clinics', title: 'Product Designer', role: 'Design', location: 'New York, NY', remote: false, salary: '$140K – $175K', equity: '0.2% – 0.6%', posted: '1d ago' },
  { id: '3', company: 'Ledgerline', batch: 'W25', tagline: 'Accounting that closes itself', title: 'Full-stack Engineer', role: 'Engineering', location: 'Remote (US)', remote: true, salary: '$160K – $200K', equity: '0.3% – 0.8%', posted: '4h ago' },
  { id: '4', company: 'Orbitkit', batch: 'S26', tagline: 'Satellite data as an API', title: 'Founding Account Executive', role: 'Sales', location: 'Austin, TX', remote: false, salary: '$120K + OTE', equity: '0.2% – 0.5%', posted: '3d ago' },
  { id: '5', company: 'Fieldwork', batch: 'W26', tagline: 'Copilot for construction crews', title: 'Head of Product', role: 'Product', location: 'Chicago, IL', remote: false, salary: '$190K – $240K', equity: '1% – 2%', posted: '6h ago' },
  { id: '6', company: 'Quillstack', batch: 'S25', tagline: 'Docs your codebase writes', title: 'Developer Advocate', role: 'Engineering', location: 'Remote', remote: true, salary: '$130K – $165K', equity: '0.1% – 0.4%', posted: '5d ago' },
  { id: '7', company: 'Grainline', batch: 'W25', tagline: 'Robotics for small farms', title: 'Robotics Software Engineer', role: 'Engineering', location: 'Sacramento, CA', remote: false, salary: '$170K – $210K', equity: '0.4% – 1%', posted: '1w ago' },
  { id: '8', company: 'Paperplane', batch: 'S26', tagline: 'Customs paperwork, automated', title: 'Founding Operations Lead', role: 'Operations', location: 'Remote (EU/US)', remote: true, salary: '$110K – $140K', equity: '0.5% – 1%', posted: '2d ago' },
];
