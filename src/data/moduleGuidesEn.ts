import type { ModuleGuide } from './moduleGuides';

export const MODULE_GUIDES_EN: Record<string, ModuleGuide> = {

  dashboard: {
    moduleId: 'dashboard',
    label: 'Main Dashboard',
    emoji: '📊',
    description: 'Your real-time operations command center',
    steps: [
      {
        icon: 'LayoutDashboard', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Real-Time KPIs',
        subtitle: 'The pulse of the plant floor at a glance',
        tips: [
          '⚡ OEE, Efficiency, and ROI indicators update automatically with live production data.',
          '🔴 A red KPI means it is currently below the target threshold — click to view details.',
          '📈 Use the Dashboard during your daily 10-minute huddle to review plant operational status.',
          '🤖 The brain icon on each card triggers an AI analysis of that specific metric.',
        ],
      },
      {
        icon: 'Bell', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Predictive Alerts',
        subtitle: 'The ERP warns you before issues occur',
        tips: [
          '🔔 Alerts appear at the top — yellow indicates caution, red requires immediate action.',
          '📦 Critical low stock, past-due maintenance, and delayed work orders are consolidated here.',
          '✅ Click "Resolve" on any alert to mark it as handled and clear the notification.',
        ],
      },
      {
        icon: 'Zap', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Quick Actions',
        subtitle: 'Launch plant operations without browsing menus',
        tips: [
          '➕ The "New Order" button creates a production work order directly from the Dashboard.',
          '💬 The AI Chat in the bottom-right corner answers queries and executes ERP commands.',
          '🎙️ Voice Link (microphone icon) allows you to speak hands-free commands to the ERP.',
        ],
      },
    ],
  },

  inventory: {
    moduleId: 'inventory',
    label: 'Pro Inventories',
    emoji: '📦',
    description: 'Absolute control over raw materials and warehouse stock',
    steps: [
      {
        icon: 'Package', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Materials Catalog',
        subtitle: 'All items tracked with real-time stock levels',
        tips: [
          '🔍 Use the search bar to locate materials by description, part key, or supplier.',
          '🔴 Items marked in red are below their safety stock level — purchase order required.',
          '📸 The AI button can recognize raw materials via photos (visual warehouse scanning).',
          '📊 The progress bar shows current warehouse storage utilization against maximum capacity.',
        ],
      },
      {
        icon: 'AlertTriangle', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30',
        title: 'Critical Stock & Alerts',
        subtitle: 'Never halt production due to material shortages',
        tips: [
          '⚠️ The "Critical" tab automatically filters materials falling below safety levels.',
          '📱 The WhatsApp button sends a direct restock alert to your purchasing team.',
          '🤖 Built-in AI suggests optimal reorder quantities based on historical lead times and consumption.',
        ],
      },
      {
        icon: 'TrendingUp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Stock Movements & Traceability',
        subtitle: 'Complete history of incoming and outgoing inventory',
        tips: [
          '📋 Every transaction logs the exact timestamp, active operator, and related work order.',
          '🔄 "Inventory adjustment" allows supervisors to easily reconcile physical count discrepancies.',
          '📈 The consumption graph reveals weekly trends to anticipate raw stock demand.',
        ],
      },
    ],
  },

  production: {
    moduleId: 'production',
    label: 'Plant Floor Control',
    emoji: '🏭',
    description: 'Track active work orders and work-in-progress',
    steps: [
      {
        icon: 'Factory', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Work Orders',
        subtitle: 'The heart of your manufacturing floor operations',
        tips: [
          '📋 Each card represents a Work Order (WO) detailing progress, steps, and assigned operators.',
          '🎨 Color indicators show status: blue = in progress, green = completed, gray = pending.',
          '➕ "New Order" automatically attaches engineering files and generates manufacturing steps.',
          '🔍 Filter by workstation (Cutting, Bending, Welding, CNC) to focus on your specific area.',
        ],
      },
      {
        icon: 'GitBranch', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Manufacturing Stages',
        subtitle: 'Track parts step-by-step through each work center',
        tips: [
          '▶️ Starting a stage automatically records the start timestamp and operator ID.',
          '✅ Completing a stage forwards the traveler to the next step in the sequence.',
          '📸 You can attach photos as quality evidence when completing any manufacturing stage.',
          '⏱️ Actual vs estimated processing time lets you know if the order is on schedule.',
        ],
      },
      {
        icon: 'BrainCircuit', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30',
        title: 'AI on the Shop Floor',
        subtitle: 'Automatic defect detection and process support',
        tips: [
          '🤖 The Neural Inspection Engine analyzes part photos to find welding or surface defects.',
          '🔴 On inspection failure, the system automatically opens a Non-Conformance Report (NCR).',
          '📊 TV Mode formats the dashboard display for overhead plant-floor monitor screens.',
        ],
      },
    ],
  },

  viajeros: {
    moduleId: 'viajeros',
    label: 'Production Travelers',
    emoji: '📄',
    description: 'Digital routing sheets that accompany every manufacturing batch',
    steps: [
      {
        icon: 'Route', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'What is a Traveler?',
        subtitle: 'The digital passport of your batch on the plant floor',
        tips: [
          '📄 The traveler physically accompanies parts: details part number, routing, and tolerances.',
          '📱 Generates as a professional PDF with unique QR codes for real-time plant floor updates.',
          '🏭 Operators sign off electronically at each workstation upon step completion.',
        ],
      },
      {
        icon: 'FileText', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Create a Traveler',
        subtitle: 'From order to plant-ready sheet in seconds',
        tips: [
          '➕ "New Traveler": input part key, client, and batch size — the AI generates the routing.',
          '⚙️ Routing paths define the sequence of work centers and standard processing hours.',
          '🖨️ Generate a clean PDF sheet complete with McVill branding, ready to print in one click.',
        ],
      },
      {
        icon: 'QrCode', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'QR Code Tracking',
        subtitle: 'Monitor exactly where every piece is in real time',
        tips: [
          '📲 Scan the traveler QR code at any workstation to update active stage status instantly.',
          '🗺️ The live tracking map shows where all travelers are currently located in the factory.',
          '📊 Real-time processing history provides actual time data to refine standard metrics.',
        ],
      },
    ],
  },

  planeacion: {
    moduleId: 'planeacion',
    label: 'AI Planning & Gantt',
    emoji: '📅',
    description: 'Interactive Gantt charts, MRP requirements, and S&OP forecast',
    steps: [
      {
        icon: 'CalendarDays', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Production Gantt',
        subtitle: 'Visual timeline of all active and scheduled work orders',
        tips: [
          '📅 Each bar represents a WO. Color segments show stage-by-step progress.',
          '⚡ "Optimize with AI" reschedules orders to group materials and minimize setup times.',
          '🔵 Blue = in progress | 🟢 Green = completed | ⬜ Gray = pending.',
        ],
      },
      {
        icon: 'ShoppingCart', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'MRP — Material Planning',
        subtitle: 'Detect supply shortages before production halts',
        tips: [
          '📦 MRP cross-references open shop orders with warehouse inventory to find deficits.',
          '🤖 "AI Purchase Suggestions" automatically compiles a prioritized raw stock buy list.',
          '🔴 Red marks critical deficits. Click the material to see which WOs depend on it.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30',
        title: 'S&OP Capacity Forecast',
        subtitle: 'Validate if open capacity matches sales commitments',
        tips: [
          '💰 Visualizes active quoting pipelines against available workstation hours.',
          '🤖 AI S&OP reviews: Can we accept this order? What bottlenecks might arise?',
          '📈 Use these predictive insights during executive meetings to make data-driven decisions.',
        ],
      },
    ],
  },

  quality: {
    moduleId: 'quality',
    label: 'Quality SGC',
    emoji: '✅',
    description: 'AI visual inspection, Non-Conformance logs, and ISO compliance',
    steps: [
      {
        icon: 'Camera', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'AI Visual Inspection',
        subtitle: 'Upload photos to analyze welding and surface defects in seconds',
        tips: [
          '📸 Click "AI ANALYSIS" → select type: 🔥 Welding, ⚙️ Assembly, 🎨 Painting, 📐 Dimensional, 🔩 Raw Material.',
          '🤖 Gemini Vision evaluates: PASS/FAIL verdict, model confidence level, and identified defects.',
          '🔥 Welding Mode flags: porosity, cracks, undercut, slag, spatter, and incomplete fusion.',
          '🎨 Painting Mode flags: paint runs, bubbles, orange peel, chips, and delamination.',
          '📝 Add inspector notes (e.g. "MIG-MAG, A36 Steel") to provide technical context for the AI.',
        ],
      },
      {
        icon: 'AlertTriangle', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30',
        title: 'Non-Conformance Reports (NCR)',
        subtitle: 'Full CAPA issue lifecycle management',
        tips: [
          '⚡ On AI PASS failure, a Non-Conformance is created with photos and severity indicators.',
          '📝 An NCR records: type, severity, root cause, corrective action, and CAPA follow-up.',
          '🔄 Workflow states: Open → In Progress → Verification → Closed.',
          '🏷️ Classifications: Minor (cosmetic) | Major (functional) | Critical (safety risk).',
        ],
      },
      {
        icon: 'Shield', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30',
        title: 'ISO 9001 Audits',
        subtitle: 'Schedule and document internal quality audits',
        tips: [
          '📋 Define audits detailing scope, auditor name, plant department, and schedule.',
          '📊 Log audit findings and ultimate verdict: Conforming / Non-Conforming / Observed.',
          '🔗 Any NCR discovered during audit is automatically linked to the audit record.',
          '📈 Six Sigma charts track plant-floor defect rates and manufacturing consistency.',
        ],
      },
    ],
  },

  factibilidad: {
    moduleId: 'factibilidad',
    label: 'AI Feasibility Filter',
    emoji: '🎯',
    description: 'Evaluate project viability before committing quotation resources',
    steps: [
      {
        icon: 'ShieldCheck', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Why Feasibility?',
        subtitle: 'The smart filter to protect your engineering bandwidth',
        tips: [
          '🎯 Reviews if a potential project is technically and operatively viable for the plant.',
          '📋 Follows the FT-IG-01 feasibility checklist standard approved by plant management.',
          '⚡ AI reviews the RFQ parameters to generate a viability scorecard within seconds.',
          '✅ Score ≥70 = Viable. 45-69 = Conditional approval. <45 = Not recommended.',
        ],
      },
      {
        icon: 'Eye', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Visual Blueprint Analysis',
        subtitle: 'Upload drawing or part snapshot',
        tips: [
          '📸 AI detects required operations (laser cutting, bending, welding) from drawing images.',
          '🔍 Evaluates material gauges and overall design complexity.',
          '💰 Automatically generates rough manufacturing cycle estimations.',
          '✅ Sends results directly to the Quoting module to pre-populate line items.',
        ],
      },
    ],
  },

  ventas: {
    moduleId: 'ventas',
    label: 'Sales & CRM',
    emoji: '💼',
    description: 'Manage customers, credit limits, and sales pipeline',
    steps: [
      {
        icon: 'CircleDollarSign', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Customer Directory',
        subtitle: 'Your centralized customer database',
        tips: [
          '👥 Track primary contacts, order histories, credit limits, and aging accounts.',
          '🔍 Search by client name, tax ID, or industry sector to find accounts instantly.',
          '📊 Summaries list active open orders, total billing, and average credit days-to-pay.',
        ],
      },
      {
        icon: 'TrendingUp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Quoting Pipeline',
        subtitle: 'Monitor open sales opportunities through completion',
        tips: [
          '📋 Quotes progress: Draft → Sent to Client → Approved → Converted to Work Order.',
          '💰 Total pipeline value calculates total projected operational revenue.',
          '🤖 The AI Quoting Agent drafts complete proposals from simple natural language descriptions.',
        ],
      },
    ],
  },

  engineering: {
    moduleId: 'engineering',
    label: 'Engineering & Design',
    emoji: '⚙️',
    description: 'Manage design projects, BOMs, blueprints, and costings',
    steps: [
      {
        icon: 'Cpu', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Engineering Projects',
        subtitle: 'From prototype concept to controlled revision design',
        tips: [
          '📐 Define core parameters: metal alloys, operations, quality tolerances, and BOM.',
          '🔗 Approved engineering projects convert into production-ready Work Orders.',
          '📋 Version control logs changes — know exactly which revision was fabricated on the floor.',
        ],
      },
      {
        icon: 'BrainCircuit', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30',
        title: 'AI Blueprint Analyzer',
        subtitle: 'Extract bill of materials from drawings via AI',
        tips: [
          '📄 Upload a PDF drawing or image — the AI model automatically compiles the BOM.',
          '⚡ What used to take hours of manual reading is completed in under 15 seconds.',
          '✏️ Review and fine-tune the extracted BOM entries before saving to the database.',
          '🔗 Cross-references inventory to verify material availability.',
        ],
      },
      {
        icon: 'Calculator', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'AI Quoting Agent',
        subtitle: 'From blueprint image to formal quote in seconds',
        tips: [
          '📸 Upload the drawing; AI identifies required operations (cutting, bending, machining).',
          '💰 Automatically structures pricing utilizing McVill’s workstation rates.',
          '🔩 Analyzes 3D STEP files to extract geometry, part weights, and raw material alloys.',
        ],
      },
    ],
  },

  nesting: {
    moduleId: 'nesting',
    label: 'Nesting Optimizer',
    emoji: '🧩',
    description: 'Optimize sheet metal layout and manage sheet scrap',
    steps: [
      {
        icon: 'Maximize', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Nesting Optimization',
        subtitle: 'Minimize sheet and plate cutting waste',
        tips: [
          '🧩 The algorithm fits 2D parts to maximize sheet metal surface utilization.',
          '📊 Yield reports state the exact percentage of material consumed vs scrap.',
          '📉 Automatically reduces raw material costs by optimizing cutting layout paths.',
          '⚙️ Supports standard sheets (4x8ft, 5x10ft) and custom sheet stock sizes.',
        ],
      },
      {
        icon: 'Recycle', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-500/20',
        title: 'Scrap & Offcut Management',
        subtitle: 'Track and reuse functional sheet offcuts',
        tips: [
          '♻️ Useful offcuts are logged back into inventory with unique scrap tags.',
          '🔍 When planning, the ERP suggests utilizing existing offcuts before cutting new sheet stock.',
          '⚖️ Waste auditing: logs sheet scrap weights to support material audit reports.',
          '💰 Estimated 15-30% material cost savings through consistent offcut tracking.',
        ],
      },
    ],
  },

  agente_cot: {
    moduleId: 'agente_cot',
    label: 'AI Quoting Agent',
    emoji: '🤖',
    description: 'Generates professional industrial quotations automatically via AI',
    steps: [
      {
        icon: 'BrainCircuit', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'How the Agent Works',
        subtitle: 'Describe your request — the AI structures the quote',
        tips: [
          '💬 Escribe en inglés o español: "50 steel structures A36, delivery in 30 days".',
          '🤖 The agent computes: material alloys, cutting, welding, paint, and overhead.',
          '📄 Generates a formal PDF quote with McVill branding, ready to download.',
          '💾 All drafted quotes are logged with revision history for customer records.',
        ],
      },
      {
        icon: 'FileText', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Fine-Tuning & Pricing',
        subtitle: 'The AI suggests, but you hold complete control',
        tips: [
          '✏️ Easily adjust line items, rates, descriptions, or quantities on the fly.',
          '💹 Adjust target margins using the slider — final price updates dynamically.',
          '📊 Detailed cost analysis visualizes exactly where the budget is allocated.',
          '🔄 Convert approved bids into active Work Orders in a single click.',
        ],
      },
    ],
  },

  rfq_kanban: {
    moduleId: 'rfq_kanban',
    label: 'RFQ Kanban Pipeline',
    emoji: '🗂️',
    description: 'Visual tracking board for Requests for Quotation',
    steps: [
      {
        icon: 'KanbanSquare', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Kanban Board',
        subtitle: 'Track commercial opportunities through all bidding stages',
        tips: [
          '🗂️ Columns: New RFQ → Technical Analysis → Proposal → Negotiation → Closed.',
          '🖱️ Drag-and-drop opportunity cards between columns to update status.',
          '⚡ "AI Feasibility" button runs a quick cap check on new RFQs.',
          '📊 Header summaries state the total pipeline value active in each stage.',
        ],
      },
      {
        icon: 'Zap', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'RFQ Auto-Quoting',
        subtitle: 'From incoming email RFQ to customer bid in minutes',
        tips: [
          '📄 Upload client emails or PDF specs; AI automatically parses quantities and parts.',
          '💰 The Quoter computes estimated raw materials and manufacturing operations.',
          '🔄 Adjust final margins and review before emailing proposals.',
        ],
      },
    ],
  },

  finance: {
    moduleId: 'finance',
    label: 'Finance & ROI',
    emoji: '💰',
    description: 'Project cash flows, margins, and operational ROI',
    steps: [
      {
        icon: 'CircleDollarSign', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Cash Flow Forecast',
        subtitle: 'Projected cash inflows and outflows week-by-week',
        tips: [
          '📊 Chart displays accounts receivable vs committed payables over an 8-week horizon.',
          '🔴 Red marks negative cash weeks — calls for collection follow-ups or deferred payments.',
          '🤖 The predictive AI model forecasts cash trends based on active orders and histories.',
        ],
      },
      {
        icon: 'TrendingUp', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Project Profitability',
        subtitle: 'Know the exact profit margin of every open order',
        tips: [
          '💹 Logs: actual material/labor costs spent vs sales price vs target margin.',
          '⚠️ Alerts highlight margin erosion if actual costs exceed the budgeted margin.',
          '📈 The ROI calculator aggregates operational savings to display software investment return.',
        ],
      },
    ],
  },

  rh: {
    moduleId: 'rh',
    label: 'Human Resources',
    emoji: '👥',
    description: 'Employee profiles, skill matrix, and personnel directory',
    steps: [
      {
        icon: 'Users', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Employee Directory',
        subtitle: 'Centralized digital file (Expediente Digital) per employee',
        tips: [
          '📂 Store IDs, certifications, contracts, and safety logs securely.',
          '📈 Skill Matrix tracks certified capabilities per workstation (e.g. MIG welder, CNC operator).',
          '🔍 Filter by shift, department, or skill to assign personnel instantly.',
          '⏰ Changes sync instantly with Attendance and Payroll modules.',
        ],
      },
      {
        icon: 'BrainCircuit', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30',
        title: 'AI Recruitment Assistant',
        subtitle: 'From resume PDF to candidate selection in minutes',
        tips: [
          '📄 Define vacancies detailing skill profiles used as AI evaluation baselines.',
          '🤖 Upload PDF resumes; AI reads, grades, and outlines applicant strengths.',
          '📊 Candidate scorecard calculates role-compatibility indexes.',
          '🚀 Generates tailored interview guides based on identified candidate gaps.',
        ],
      },
      {
        icon: 'CheckCircle2', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Onboarding & Training',
        subtitle: 'Accelerated paths for new plant hires',
        tips: [
          '📋 Auto-generates onboarding checklists mapped to role requirements.',
          '🎯 Mandatory safety, quality, and technical training tracking checks.',
          '📅 Monitor performance checkpoints during the first 90 days.',
        ],
      },
    ],
  },

  payroll: {
    moduleId: 'payroll',
    label: 'Payroll Processor',
    emoji: '💵',
    description: 'Calculate employee wages based on actual plant timecard records',
    steps: [
      {
        icon: 'CircleDollarSign', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Payroll Calculator',
        subtitle: 'Automated wage calculation from raw shift clock-ins',
        tips: [
          '💰 Calculates gross/net wages based on actual logged hours and daily rates.',
          '⏱️ Automatically incorporates approved overtime hours.',
          '📋 Generates professional PDF paystubs for employees in one click.',
        ],
      },
      {
        icon: 'FileText', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Deductions & Attendance Gaps',
        subtitle: 'Log absences, leaves, and social deductions',
        tips: [
          '📝 Log specific attendance events: excused absence, medical leave, late arrivals.',
          '🔗 Timecard events from the Attendance module sync directly with Payroll.',
          '✅ Complete audit checks before processing final payments.',
        ],
      },
    ],
  },

  attendance: {
    moduleId: 'attendance',
    label: 'Attendance Tracking',
    emoji: '🕐',
    description: 'Check-in, check-out, Face ID Biometrics & IP Geofencing',
    steps: [
      {
        icon: 'CalendarCheck', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Kiosk Face ID Biometrics',
        subtitle: 'High-speed check-ins for shop-floor operators',
        tips: [
          '👤 "Face ID AI" Tab: A single entrance tablet acts as a collective kiosk for shop-floor operators.',
          '🤖 Single Supervisor Credentials: Low IT overhead; operators require no password logins or PCs.',
          '⚡ High-Speed Scanning: Biometric face capture in <2s with 36.5 °C body temperature checks and liveness audits.',
          '🔗 Neural Link: Gemini Vision identifies the operator and submits secure timecard updates to Supabase.',
        ],
      },
      {
        icon: 'Laptop', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30',
        title: 'Desk Timecards via IP/GPS',
        subtitle: 'Desktop check-ins for administrative offices',
        tips: [
          '💼 Corporate employees check in with 1 click directly from their logged-in active sessions on their PCs.',
          '🔒 Network IP Locks: Check-in buttons are disabled if request traffic originates outside plant Wi-Fi.',
          '📍 GPS Geofencing: Secure geofences enforce that browser coordinates fall within 50 meters of corporate offices.',
          '🚫 Anti-Fraud Gates: Automatically rejects out-of-bounds attendance logging.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Attendance Reports',
        subtitle: 'Audit plant-floor attendance patterns',
        tips: [
          '📊 Daily logs list active on-site personnel and current shift coverage.',
          '📈 Weekly stats highlight employees showing chronic absenteeism patterns.',
          '💬 AI Chat command: "Who is absent today?" yields instant timecard results.',
          '🎙️ Live Voice Link: Speak directly to the AI to query who is late or absent in real time.',
        ],
      },
    ],
  },

  desempeno: {
    moduleId: 'desempeno',
    label: 'Performance & Incentives',
    emoji: '🏆',
    description: 'Track operator KPIs, performance rankings, and bonuses',
    steps: [
      {
        icon: 'Medal', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Operator Metrics',
        subtitle: 'Evaluate floor teams with objective performance data',
        tips: [
          '📊 Track operator metrics: OEE, quality yield, and schedule adherence.',
          '🏆 Ranking boards highlight top operators per workstation and shift.',
          '📈 Updates automatically with live shop floor traveler inputs.',
        ],
      },
      {
        icon: 'CircleDollarSign', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Incentive Bonuses',
        subtitle: 'Reward outstanding operators automatically',
        tips: [
          '💰 Set parameters for bonuses (e.g. bonus if operator efficiency exceeds 100%).',
          '✅ Supervisors audit and approve calculated bonus logs prior to payroll sync.',
          '📋 Complete ledger of bonuses issued per employee.',
        ],
      },
    ],
  },

  maintenance: {
    moduleId: 'maintenance',
    label: 'Maintenance',
    emoji: '🔧',
    description: 'Asset tracking, preventive maintenance, and repairs',
    steps: [
      {
        icon: 'Wrench', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30',
        title: 'Asset Ledger',
        subtitle: 'Track equipment status and health levels',
        tips: [
          '🏭 Track equipment details: serial numbers, location, and Health Scores.',
          '💚 Health Score 80-100 = operational. 60-79 = service due. <60 = critical repair required.',
          '📸 Attach photo logs of machinery and wear areas to document status.',
        ],
      },
      {
        icon: 'Clock', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Preventive Scheduling',
        subtitle: 'Prevent equipment breakdowns before they occur',
        tips: [
          '📅 Set recurring plans: daily checks, weekly lubes, or running-hours checks.',
          '🔔 Automatic alerts highlight when the next PM service date approaches.',
          '✅ Record completed service: technician ID, hours, replacement parts.',
          '🤖 Predictive AI analyzes past failures to forecast when machines may break down.',
        ],
      },
    ],
  },

  hse: {
    moduleId: 'hse',
    label: 'SAFETY',
    emoji: '🦺',
    description: 'Industrial safety logs, safety incidents, and NOM regulatory compliance',
    steps: [
      {
        icon: 'ShieldAlert', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30',
        title: 'Incident Logging',
        subtitle: 'Document and analyze safety occurrences',
        tips: [
          '⚠️ Log safety incidents detailing location, employee ID, and corrective actions.',
          '📊 Heat maps locate risk zones inside the plant floor.',
          '🔍 Incidents trigger immediate Root Cause (RCA) and Corrective (CAPA) steps.',
        ],
      },
      {
        icon: 'CheckCircle2', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Safety PPE Compliance',
        subtitle: 'Track employee safety PPE issues and training certifications',
        tips: [
          '🦺 Logs PPE assignments detailing issue dates and service life thresholds.',
          '📋 Log safety training completions and renewal dates.',
          '🔔 Alerts notify officers when PPE reach replacement limits.',
          '📑 Supports regulatory standards: NOM-017-STPS-2008 (PPE), NOM-010-STPS-2014 (Chemicals), NOM-113-STPS-2009 (Footwear).',
        ],
      },
      {
        icon: 'Eye', color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/30',
        title: 'Neural Floor PPE Inspection',
        subtitle: 'Autonomous AI-powered plant-floor safety audits',
        tips: [
          '🤖 AI Safety Inspection: The "Scan EPP" button on plant CCTV camera feeds monitors operator safety equipment.',
          '📹 Shop-floor visual feeds: Active canvases (Welding C2 with sparks, Paint C5, Storage C3) trace PPE levels.',
          '⚡ Laser Scan HUD: Renders base64 frames to Gemini Vision to verify hard hats, gloves, shields, and eyewear.',
          '🔊 Web Audio Sirens: Web Audio dual-oscillators synthesize high-decibel acoustic warning beeps if EPP faults are detected.',
        ],
      },
    ],
  },

  spc: {
    moduleId: 'spc',
    label: 'SPC Statistical Control',
    emoji: '📉',
    description: 'Manage X̄-R control charts and process capability indexes',
    steps: [
      {
        icon: 'Activity', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Why SPC?',
        subtitle: 'Identify process variations before parts fall out-of-spec',
        tips: [
          '📊 SPC charts track process metrics to determine if a line runs under control.',
          '📏 Track crucial parameters (e.g. bore size 50±0.05mm) with real-time logs.',
          '🔔 Automated alerts trigger if measurements exceed control limits (UCL/LCL).',
          '🤖 AI automatically tests against the 4 Shewhart/Nelson rules.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Process Capability (Cp, Cpk)',
        subtitle: 'Evaluate manufacturing consistency mathematically',
        tips: [
          '📈 Cp ≥1.33 = Capable process (less than 63 PPM defect rate).',
          '⚠️ Cpk <1.0 = Non-capable process — requires immediate process adjustments.',
          '🏭 Monitor multiple metrics simultaneously on the central SPC dashboard.',
        ],
      },
    ],
  },

  work_instructions: {
    moduleId: 'work_instructions',
    label: 'Work Instructions SOP',
    emoji: '📖',
    description: 'Digital standard operating procedures by workstation',
    steps: [
      {
        icon: 'BookOpen', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30',
        title: 'Standard SOPs',
        subtitle: 'Step-by-step assembly guides with visual aids',
        tips: [
          '🖼️ SOPs include photo references of "Conforming Parts" to ensure quality.',
          '⚠️ Critical safety highlights and hazards are marked in red.',
          '🔄 Updating an SOP in engineering pushes changes to all plant tablets instantly.',
        ],
      },
      {
        icon: 'CheckSquare', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-500/20',
        title: 'Verification Gates',
        subtitle: 'Operator sign-offs at critical control checks',
        tips: [
          '✅ Operators check off critical steps before moving to subsequent stages.',
          '📏 Mapped tolerances and specific gauges required for inspection.',
          '📋 Sign-off history logs directly to the Traveler details.',
        ],
      },
    ],
  },

  visual_ia: {
    moduleId: 'visual_ia',
    label: 'AI Visual Inspection',
    emoji: '👁️',
    description: 'Automatic defect detection using neural vision analysis',
    steps: [
      {
        icon: 'Camera', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Capture & Inspection',
        subtitle: 'Inspect parts from mobile tablets or cameras',
        tips: [
          '📱 Runs from standard web browsers on tablets — no complex setups.',
          '🔥 Welding: detects porosity, slag, cracks, undercut, and spatter.',
          '⚙️ Assembly: identifies missing components, bolts, and alignment errors.',
          '🎨 Painting: detects runs, bubbles, orange peel, and scratches.',
          '📐 Dimensions: flags burrs, dents, and off-center holes.',
        ],
      },
      {
        icon: 'AlertCircle', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/30',
        title: 'Automated NCR Gates',
        subtitle: 'Auto-logging Non-Conforming parts',
        tips: [
          '⚠️ AI FAIL verdicts automatically open a new Non-Conformance Report.',
          '📊 Severity scores are assigned dynamically based on AI confidence levels.',
          '🔔 Immediate push alerts are dispatched to area quality managers on critical failures.',
          '📈 Defect analytical graphs show defect trends per shift.',
        ],
      },
    ],
  },

  roi: {
    moduleId: 'roi',
    label: 'ROI Calculator',
    emoji: '📈',
    description: 'Assess project profitability and investment paybacks',
    steps: [
      {
        icon: 'TrendingUp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Return Analysis',
        subtitle: 'Calculate project payback profiles',
        tips: [
          '💰 Input startup expenditures alongside expected cost savings.',
          '📊 Computes key financial indices: ROI, Payback Period, and NPV.',
          '🤖 Compare calculations against historical projects to evaluate risk.',
          '📄 Generates executive financial summaries in PDF format.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Scenario Testing',
        subtitle: 'Model alternative options',
        tips: [
          '🔄 Compare different project scenarios side-by-side.',
          '📈 Net cash projection charts visualize exactly when break-even is achieved.',
          '⚠️ Sensitivity checkers indicate which variables impact final returns the most.',
        ],
      },
    ],
  },

  compras: {
    moduleId: 'compras',
    label: 'Purchasing',
    emoji: '🛒',
    description: 'Manage Purchase Orders, suppliers, and incoming stock',
    steps: [
      {
        icon: 'ShoppingCart', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Purchase Orders',
        subtitle: 'From procurement request to stock receipt',
        tips: [
          '📋 Draft purchase orders directly from low inventory lists.',
          '📄 Generate formal purchase order PDFs containing delivery terms.',
          '🔄 States: Draft → Approved → Dispatched to Vendor → Received → Closed.',
          '📦 Material receipt logs automatically update warehouse inventory stocks.',
        ],
      },
      {
        icon: 'Users', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Supplier Ratings',
        subtitle: 'Rank suppliers by cost, timing, and quality parameters',
        tips: [
          '⭐ Each supplier is rated: delivery speed, defect rates, and pricing.',
          '🤖 AI points out optimal suppliers per material based on performance scores.',
          '📊 Compile and compare quotes from multiple vendors on one panel.',
        ],
      },
    ],
  },

  factibilidad_ia: {
    moduleId: 'factibilidad_ia',
    label: 'Advanced AI Feasibility',
    emoji: '🧠',
    description: 'In-depth project feasibility analysis powered by generative AI',
    steps: [
      {
        icon: 'BrainCircuit', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30',
        title: 'Deep AI Viability',
        subtitle: 'Thorough cap analysis beyond checklists',
        tips: [
          '💬 Describe your industrial project parameters; AI asks clarifying questions.',
          '🔍 Scans: alloy complexities, plant hours, delivery windows, and profit margins.',
          '📊 Score reports outline specific warning signs and technical risks.',
          '📄 Generates clean technical feasibility PDFs to support customer bids.',
        ],
      },
      {
        icon: 'Camera', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Blueprint Image Parsing',
        subtitle: 'Auto-extract processes from blueprint drawings',
        tips: [
          '📸 AI detects processes, materials, and runtime estimates from images.',
          '⚡ Answers within seconds vs hours of design team review.',
          '✅ Transmits data directly to cost-sheet line items.',
        ],
      },
    ],
  },

  metal_quoter: {
    moduleId: 'metal_quoter',
    label: 'Metal Quoting',
    emoji: '🔩',
    description: 'Precision costing calculator for metalworking parts',
    steps: [
      {
        icon: 'Calculator', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Process-Based Costing',
        subtitle: 'Granular cycle times per workstation operation',
        tips: [
          '🔩 Set stages: Cutting, Bending, Welding, CNC Machining, Paint, or Assembly.',
          '📐 Input thickness, weights, and gauge; system calculates base materials costs.',
          '⏱️ Standard plant rates are applied automatically to process times.',
          '💰 Configured overhead percentages dynamically adjust final prices.',
        ],
      },
      {
        icon: 'FileText', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Multi-Item Cost sheets',
        subtitle: 'Quote complex assemblies containing dozens of subparts',
        tips: [
          '📋 Structure complex subparts as individual line items.',
          '📄 Print clean sales-ready PDFs detailing manufacturing breakdowns.',
          '🔄 Convert approved cost sheets into active work orders.',
        ],
      },
    ],
  },

  costing: {
    moduleId: 'costing',
    label: 'Cost Control',
    emoji: '💲',
    description: 'Track actual vs budgeted costs for every work order',
    steps: [
      {
        icon: 'BarChart3', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Actual Order Cost',
        subtitle: 'Monitor profit margins on active batches',
        tips: [
          '📊 Accumulates actuals: raw materials + technician hours + overhead.',
          '⚠️ Alerts warn managers if actual costs exceed targets by over 5%.',
          '💹 Net margins update dynamically as travelers scan through stations.',
          '🔍 Drill down into cost categories to find variance leaks.',
        ],
      },
      {
        icon: 'TrendingUp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Margin Analysis',
        subtitle: 'Identify high-margin products and customers',
        tips: [
          '📈 Ranks open/closed orders by achieved net margins.',
          '👥 Customer margin ratings rank accounts by ultimate profit values.',
          '🤖 Generates suggestions to optimize quoting rules or process paths.',
        ],
      },
    ],
  },

  costeo: {
    moduleId: 'costeo',
    label: 'Live Costing',
    emoji: '⚡',
    description: 'Dynamic material quoting linked to global metal index prices',
    steps: [
      {
        icon: 'Gauge', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Index Pricing',
        subtitle: 'Automatically link material costs to raw stock rates',
        tips: [
          '📡 Raw metal base rates update from certified supplier feeds.',
          '⚡ Changes in raw steel prices immediately update open, unapproved quotes.',
          '🔔 Warnings notify commercial teams if raw stock increases threaten target margins.',
        ],
      },
      {
        icon: 'LineChart', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Sensitivity Simulators',
        subtitle: 'Model cost changes on bottom lines',
        tips: [
          '🎚️ Drag sliders to model raw stock or labor rate increases.',
          '📊 Clearly visualizes fixed vs variable cost ratios per part.',
          '💰 Use during vendor pricing reviews to secure margins.',
        ],
      },
    ],
  },

  recruitment: {
    moduleId: 'recruitment',
    label: 'AI Recruitment',
    emoji: '🎯',
    description: 'AI resume parsing and candidate pipelines',
    steps: [
      {
        icon: 'UserSearch', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'AI Resume Analysis',
        subtitle: 'Extract candidate details and grade applicants automatically',
        tips: [
          '📄 Set role descriptions to define AI candidate match metrics.',
          '🤖 Upload candidate PDF resumes; AI models extract capabilities and grade fits.',
          '📊 Scorecards rank applicants from 0 to 100 with comprehensive match reviews.',
          '🚀 Auto-generates candidate-specific interview guides.',
        ],
      },
      {
        icon: 'ClipboardList', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Candidate Pipeline',
        subtitle: 'Manage hiring stages visually',
        tips: [
          '🗂️ Kanban board: New Resumes → Screened → Interview Scheduled → Offered → Hired.',
          '📅 Schedule interview details and log reviews directly on candidate cards.',
          '✅ Converted candidates automatically populate HR employee files.',
        ],
      },
    ],
  },

  trazabilidad: {
    moduleId: 'trazabilidad',
    label: 'Traceability',
    emoji: '🔗',
    description: 'Trace parts, materials, and QC results throughout manufacturing lifecycles',
    steps: [
      {
        icon: 'GitBranch', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Traceability Genealogy',
        subtitle: 'Complete history map of every fabricated part',
        tips: [
          '🔍 Search part keys to view: receipt dates, floor operations, and delivery details.',
          '🌳 BOM tree diagrams outline subcomponent connections clearly.',
          '📦 Raw alloy heat trace: identifies exactly which sheet stock heat code was used.',
          '🚨 Instantly isolate and quarantine all related parts on quality recall events.',
        ],
      },
      {
        icon: 'QrCode', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'QR Traceability',
        subtitle: 'Scan traveler QR codes to view detailed histories',
        tips: [
          '📲 Scan QRs to pull full process routing logs on plant tablets.',
          '📸 View stage-by-step photo logs taken by operators.',
          '📋 Compile formal PDF quality certifications ready for customer reviews.',
        ],
      },
    ],
  },

  defect_library: {
    moduleId: 'defect_library',
    label: 'Defect Library',
    emoji: '📚',
    description: 'Visual reference catalog of defects and plant corrective actions',
    steps: [
      {
        icon: 'Library', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Defect Catalog',
        subtitle: 'Reference library of identified defects',
        tips: [
          '📸 References contain: visual photos, descriptions, causes, and solutions.',
          '🔍 Filter by manufacturing center or defect level for quick access.',
          '🤖 AI automatically maps new NCR events to matching catalog cases.',
          '📚 Train new technicians using verified visual defect examples.',
        ],
      },
      {
        icon: 'BrainCircuit', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30',
        title: 'Lessons Learned',
        subtitle: 'Preserving plant-floor operational knowledge',
        tips: [
          '💡 Logs: plant issue occurrences, business impacts, and preventative rules.',
          '🔔 Matching NCRs automatically surface relevant lessons learned.',
          '📊 Frequency charts identify which defect types occur most across departments.',
        ],
      },
    ],
  },

  ppap: {
    moduleId: 'ppap',
    label: 'PPAP Approval',
    emoji: '📋',
    description: 'Document and track the 18 elements of the Production Part Approval Process',
    steps: [
      {
        icon: 'FileCheck2', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'PPAP Element Packages',
        subtitle: 'Manage Level 1-5 PPAP element compliance',
        tips: [
          '📋 Logs: process flows, control plans, FMEAs, and dimensional FAI logs.',
          '📐 Log initial FAI measurements against blueprint tolerance dimensions.',
          '✅ Validates that all required elements are uploaded before package submission.',
          '📄 Generates clean PSG-style PPAP package folders ready for customer sign-off.',
        ],
      },
      {
        icon: 'CheckCircle2', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Approval Tracking',
        subtitle: 'Real-time status of submissions',
        tips: [
          '🔄 States: Compiling → Submitted to Client → Reviewing → Approved / Rejected.',
          '🔔 Notifications flag customer requests for revision corrections.',
          '📁 Secure archive stores approved PPAPs per customer account.',
        ],
      },
    ],
  },

  voc: {
    moduleId: 'voc',
    label: 'Voice of Client (VOC)',
    emoji: '💬',
    description: 'Collect and track customer feedback and quality complaints',
    steps: [
      {
        icon: 'MessageCircle', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Customer Feedback Logs',
        subtitle: 'Document customer reviews and complaints',
        tips: [
          '📝 Records comments, returns, and direct compliments from customer accounts.',
          '🔗 Links feedback logs to specific work orders and floor managers.',
          '⚡ Client complaints automatically trigger CAPA tasks for quality teams.',
          '📊 Live NPS scores calculate overall customer satisfaction values.',
        ],
      },
      {
        icon: 'TrendingUp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Trend Analyses',
        subtitle: 'Prioritize plant improvement tasks',
        tips: [
          '📈 Pareto charts sort complaints to target core quality issues first.',
          '🤖 Sentiment engines parse feedback tone to highlight urgent issues.',
          '📋 Clean VOC reports ready for executive performance reviews.',
        ],
      },
    ],
  },

  layout_design: {
    moduleId: 'layout_design',
    label: 'Plant Layout Editor',
    emoji: '🗺️',
    description: 'Model and optimize workstation material transport paths',
    steps: [
      {
        icon: 'Layout', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Plant Layouts',
        subtitle: 'Design high-efficiency workstation setups',
        tips: [
          '🗺️ Drag-and-drop workstations onto the plant floor editor grids.',
          '🔄 Flow vectors trace part paths between machining stages.',
          '⚡ Transport calculators identify redundant movements and bottlenecks.',
          '🤖 AI suggests machine shifts to shorten total batch transport paths.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Load Balancing',
        subtitle: 'Balance capacities across work cells',
        tips: [
          '⚖️ Line balance charts highlight slow stations triggering delays.',
          '📊 Station efficiency checks calculate operator active utilization ratios.',
          '🏭 Simulate shifts before moving heavy equipment on the physical plant floor.',
        ],
      },
    ],
  },

  process_simulator: {
    moduleId: 'process_simulator',
    label: 'Process Simulator',
    emoji: '🧪',
    description: 'Model and simulate manufacturing cycles to identify bottleneck zones',
    steps: [
      {
        icon: 'FlaskConical', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Cycle Simulations',
        subtitle: 'Test operational shifts without plant disruptions',
        tips: [
          '🧪 Define stages, durations, resources, and stage failure rates.',
          '▶️ Simulate monthly schedules to test flow parameters.',
          '📊 Output metrics list: hourly throughput, WIP levels, and machine utilization.',
          '🤖 AI points out optimized process layouts matching your production targets.',
        ],
      },
      {
        icon: 'TrendingUp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Scenario Analysis',
        subtitle: 'Evaluate before-and-after improvements',
        tips: [
          '🔄 Run active vs proposed layout scenarios side-by-side.',
          '💰 Calculate margin returns: saved workstation hours × operator rate.',
          '📋 Professional reports justify CAPEX spending on line layouts.',
        ],
      },
    ],
  },

  shop_floor: {
    moduleId: 'shop_floor',
    label: 'Shop Floor Monitor',
    emoji: '🏭',
    description: 'Real-time visibility into machine status and production metrics',
    steps: [
      {
        icon: 'Scan', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Live Floor Board',
        subtitle: 'Track equipment and operator states in real time',
        tips: [
          '🟢 Green = producing | 🟡 Yellow = workstation setup | 🔴 Red = machine down.',
          '📡 Data refreshes every 30 seconds from traveler workstation inputs.',
          '📺 TV Mode adjusts dashboards for overhead plant television monitors.',
          '⚡ Machine down events trigger instant push messages to maintenance.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'OEE & Machine Downtimes',
        subtitle: 'Evaluate actual plant-floor equipment capacities',
        tips: [
          '📊 OEE = Availability × Performance × Quality — the complete plant metrics index.',
          '⏱️ Categorize downtimes: tooling errors, stock gaps, or setup delays.',
          '📈 Pareto charts sort downtime events to target main mechanical issues first.',
        ],
      },
    ],
  },

  minutas: {
    moduleId: 'minutas',
    label: 'AI Meeting Minutes',
    emoji: '📝',
    description: 'Generate structured meeting minutes and action tasks via AI',
    steps: [
      {
        icon: 'ScrollText', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Draft Minutes via AI',
        subtitle: 'From messy notes to structured minutes in seconds',
        tips: [
          '🎙️ Paste meeting transcripts or key notes directly into the editor.',
          '🤖 AI structures: attendees, discussed topics, and action agreements.',
          '📅 Tasks list assigned employee IDs alongside specific delivery dates.',
          '📄 Generates clean, ready-to-share PDF minutes in one click.',
        ],
      },
      {
        icon: 'CheckCircle2', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Task Tracking',
        subtitle: 'Monitor team task completion statuses',
        tips: [
          '📋 Action boards compile all open agreements with timing countdowns.',
          '🔔 Alert reminders notify owners when action deadlines approach.',
          '✅ Completed task sign-offs log the exact closing time and author.',
        ],
      },
    ],
  },

  reports: {
    moduleId: 'reports',
    label: 'KPI Reports',
    emoji: '📊',
    description: 'Generate detailed PDF executive KPI reports for any period',
    steps: [
      {
        icon: 'FileBarChart', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Automated Reports',
        subtitle: 'Consolidated performance metrics for managers',
        tips: [
          '📊 Set period (day, week, fiscal month) and select target operational metrics.',
          '📄 Compiles a professional PDF containing tables, charts, and metrics.',
          '🤖 Generates a concise 3-point AI brief highlighting successes and warning points.',
          '📧 Set automated schedules to email PDF reports to directors every Monday.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Executive Dashboards',
        subtitle: 'High-level operational stats for company directors',
        tips: [
          '📈 Tracks: OEE averages, first-time-through yield, margin erosion, and scrap.',
          '🔴 Out-of-bounds metrics are flagged alongside their weekly drift direction.',
          '💼 Perfect summaries for monthly executive reviews.',
        ],
      },
    ],
  },

};

export const DEFAULT_GUIDE_EN: ModuleGuide = {
  moduleId: 'default',
  label: 'McVill ERP Control',
  emoji: '⚡',
  description: 'AI-driven industrial operations assistant',
  steps: [
    {
      icon: 'Cpu', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
      title: 'Control Core v2.5',
      subtitle: 'Your AI-powered plant ERP system',
      tips: [
        '💬 The AI Chat in the bottom-right corner answers questions and triggers actions.',
        '🎙️ Voice Link (microphone icon) guides you hands-free via spoken commands.',
        '❓ Click the "Guide" button in any module to review step-by-step tips.',
        '⚡ The system learns from McVill data to provide real-time contextual help.',
      ],
    },
  ],
};
