# JobTest architecture

How the pieces fit together. GitHub draws this diagram automatically; to edit it, change the
Mermaid code below (or paste it into https://mermaid.live to see changes live). Keep it in step
with the code — see "Keeping this diagram up to date" at the bottom.

- **People** use the website (orange), which is hosted on Vercel.
- **Pages** call **services** (blue); services read and write **Appwrite** (green).
- The **Node.js function** (purple) reacts to new rows and runs every hour.

```mermaid
flowchart LR
    %% ---------- People ----------
    U((Job seeker))
    E((Employer))
    M((Site moderator))

    %% ---------- Hosting ----------
    subgraph HOST["Hosting"]
        GH["GitHub repo<br/>IbtcGarry/JobRepo"]
        VC["Vercel<br/>jobtest-beta.vercel.app"]
    end

    %% ---------- Frontend ----------
    subgraph FE["Frontend: Angular 21 + TypeScript (frontend/src/app)"]
        direction TB
        SHELL["App shell (app.ts / app.html)<br/>header: Jobs, Map, Companies, Post a job,<br/>Saved, Applications, Messages, Settings"]
        ROUTES["app.routes.ts<br/>lazy-loaded pages + guards"]

        subgraph PUB["Public pages"]
            P1["Front page + job board"]
            P2["Map search<br/>price-tag pins, radius, alerts"]
            P3["Job details"]
            P4["Companies list / company page"]
            P5["Public profile"]
        end
        subgraph SEEK["Signed-in pages"]
            P6["Sign up / Log in / Onboarding"]
            P7["Account: Profile + Company tabs<br/>(moderation link for moderators)"]
            P8["Settings + Log out"]
            P9["Apply + screening questions"]
            P10["Saved jobs"]
            P11["My applications"]
            P12["Messages inbox + thread"]
        end
        subgraph EMP["Employer pages (employerGuard)"]
            P13["Edit company"]
            P14["Company admin dashboard"]
            P15["Post / edit job<br/>preview, draft, closing date"]
            P16["Applicants: list + pipeline board"]
            P17["View application"]
        end
        subgraph MOD["Moderator page (moderatorGuard)"]
            P18["Moderation /admin<br/>reports"]
        end

        SHARED["shared/ components<br/>job card, filter bar, avatar, save job,<br/>report, company team, join company,<br/>manage jobs, question editor"]
        DATA["data/ pure logic (unit tested)<br/>job filters, screening, geo, map search,<br/>job format, admin totals"]

        subgraph CORE["core/ services"]
            S1["AuthService + guards"]
            S2["ProfileService"]
            S3["CompanyService"]
            S4["JobService"]
            S5["ApplicationService"]
            S6["MessageService"]
            S7["InviteService"]
            S8["AlertService"]
            S9["ReportService"]
            S10["NotificationService<br/>(no UI at the moment)"]
            S11["Geocode"]
        end
    end

    %% ---------- Backend ----------
    subgraph BE["Backend: Appwrite Cloud (project JobTesting)"]
        direction TB
        AUTH["Accounts<br/>username + password"]
        subgraph DB["Database 'main'"]
            T1[("profiles")]
            T2[("companies")]
            T3[("jobs")]
            T4[("applications")]
            T5[("messages")]
            T6[("invites")]
            T7[("alerts")]
            T8[("reports")]
            T9[("notifications")]
        end
        BUCKET[("Storage bucket 'uploads'<br/>resumes, pictures, logos")]
        RT["Realtime<br/>live messages"]
        FN["Node.js 22 Function 'notifier'<br/>functions/notifier"]
    end

    %% ---------- External ----------
    subgraph EXT["External services"]
        OSM["OpenStreetMap<br/>Nominatim lookup + map tiles"]
        GM["Google Maps links"]
    end

    %% ---------- Flows ----------
    U --> SHELL
    E --> SHELL
    M --> SHELL
    GH -->|push to main deploys| VC
    VC -->|serves| SHELL
    SHELL --> ROUTES
    ROUTES --> PUB
    ROUTES --> SEEK
    ROUTES --> EMP
    ROUTES --> MOD
    PUB --> SHARED
    SEEK --> SHARED
    EMP --> SHARED
    SHARED --> DATA
    PUB --> CORE
    SEEK --> CORE
    EMP --> CORE
    MOD --> CORE

    S1 --> AUTH
    S2 --> T1
    S2 --> BUCKET
    S3 --> T2
    S3 --> BUCKET
    S4 --> T3
    S5 --> T4
    S6 --> T5
    S6 -.-> RT
    S7 --> T6
    S8 --> T7
    S9 --> T8
    S10 --> T9
    S11 --> OSM
    P3 --> GM

    T4 -->|new application / stage change| FN
    T3 -->|job posted| FN
    T6 -->|invite sent| FN
    FN -->|matches alerts| T7
    FN -->|writes| T9
    FN -->|every 60 min: close expired jobs| T3

    %% ---------- Colours ----------
    classDef person fill:#fff,stroke:#111,color:#111
    classDef page fill:#ffe8d6,stroke:#e8590c,color:#111
    classDef service fill:#e7f0ff,stroke:#2563eb,color:#111
    classDef store fill:#e6f4ea,stroke:#2e7d32,color:#111
    classDef fn fill:#f1e8ff,stroke:#7c3aed,color:#111
    classDef ext fill:#f1f1f1,stroke:#9e9e9e,color:#333
    class U,E,M person
    class SHELL,ROUTES,P1,P2,P3,P4,P5,P6,P7,P8,P9,P10,P11,P12,P13,P14,P15,P16,P17,P18,SHARED page
    class S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,DATA service
    class AUTH,T1,T2,T3,T4,T5,T6,T7,T8,T9,BUCKET,RT store
    class FN fn
    class GH,VC,OSM,GM ext
```

## Where each box lives in the code

| Box | Code |
| --- | --- |
| App shell | `frontend/src/app/app.ts`, `app.html`, `app.scss` |
| app.routes.ts | `frontend/src/app/app.routes.ts` (guards in `core/auth.guards.ts`) |
| Pages | `frontend/src/app/pages/` — one folder or file per page |
| shared/ components | `frontend/src/app/shared/` |
| data/ pure logic | `frontend/src/app/data/` (tests: `*.spec.ts`) |
| core/ services | `frontend/src/app/core/` |
| Appwrite tables and bucket | Appwrite Console → JobTesting; recorded in `appwrite.json` |
| Node.js function | `functions/notifier/` (see `functions/README.md`) |

## Keeping this diagram up to date

When you add a page, service, table or function, add a box for it in the Mermaid code above
(copy a line in the same group) and an arrow for what it talks to. To regenerate it with an AI
tool instead, the prompt used originally is in the "JobTest Code Walkthrough" doc.
