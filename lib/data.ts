export const salesChartData = [
  { month: "Jan", revenue: 42000, leads: 120, deals: 28 },
  { month: "Feb", revenue: 58000, leads: 145, deals: 34 },
  { month: "Mar", revenue: 51000, leads: 132, deals: 30 },
  { month: "Apr", revenue: 67000, leads: 178, deals: 42 },
  { month: "May", revenue: 73000, leads: 195, deals: 48 },
  { month: "Jun", revenue: 89000, leads: 220, deals: 55 },
  { month: "Jul", revenue: 95000, leads: 248, deals: 62 },
  { month: "Aug", revenue: 112000, leads: 267, deals: 71 },
  { month: "Sep", revenue: 98000, leads: 234, deals: 58 },
  { month: "Oct", revenue: 134000, leads: 298, deals: 84 },
  { month: "Nov", revenue: 148000, leads: 312, deals: 92 },
  { month: "Dec", revenue: 167000, leads: 345, deals: 108 },
];

export const revenueByCategory = [
  { category: "Enterprise", value: 485000, growth: 28 },
  { category: "SMB", value: 312000, growth: 15 },
  { category: "Startup", value: 198000, growth: 42 },
  { category: "Agency", value: 145000, growth: 19 },
  { category: "Freelance", value: 78000, growth: 8 },
];

export const leadConversionData = [
  { name: "Converted", value: 682, color: "#3b82f6" },
  { name: "Qualified", value: 284, color: "#8b5cf6" },
  { name: "In Progress", value: 198, color: "#06b6d4" },
  { name: "Cold", value: 83, color: "#1e2d45" },
];

export const teamPerformanceData = [
  { name: "Sarah", deals: 28, revenue: 124000, target: 130000 },
  { name: "Mike", deals: 22, revenue: 98000, target: 100000 },
  { name: "Priya", deals: 31, revenue: 142000, target: 140000 },
  { name: "James", deals: 19, revenue: 87000, target: 90000 },
  { name: "Aisha", deals: 26, revenue: 115000, target: 120000 },
];

export const leads = [
  { id: 1, name: "Alex Morgan", company: "TechNova Inc.", email: "alex@technova.com", phone: "+1 555-0101", score: 92, status: "hot", stage: "Qualified", value: 45000, owner: "Sarah Chen", avatar: "AM", lastContact: "2h ago", tags: ["Enterprise", "SaaS"] },
  { id: 2, name: "Priya Sharma", company: "CloudScale", email: "priya@cloudscale.io", phone: "+1 555-0102", score: 85, status: "warm", stage: "Discovery", value: 28000, owner: "Mike Ross", avatar: "PS", lastContact: "1d ago", tags: ["SMB", "Cloud"] },
  { id: 3, name: "David Chen", company: "FinEdge Corp", email: "david@finedge.com", phone: "+1 555-0103", score: 78, status: "warm", stage: "Proposal", value: 95000, owner: "Priya Nair", avatar: "DC", lastContact: "3h ago", tags: ["Finance", "Enterprise"] },
  { id: 4, name: "Maria Garcia", company: "StartupHub", email: "maria@startuphub.co", phone: "+1 555-0104", score: 62, status: "cold", stage: "Discovery", value: 12000, owner: "James Wu", avatar: "MG", lastContact: "5d ago", tags: ["Startup"] },
  { id: 5, name: "Ryan O'Brien", company: "RetailPro", email: "ryan@retailpro.com", phone: "+1 555-0105", score: 88, status: "hot", stage: "Negotiation", value: 67000, owner: "Aisha Patel", avatar: "RO", lastContact: "30m ago", tags: ["Retail", "B2B"] },
  { id: 6, name: "Lisa Zhang", company: "HealthTech AI", email: "lisa@healthtechai.com", phone: "+1 555-0106", score: 95, status: "hot", stage: "Proposal", value: 128000, owner: "Sarah Chen", avatar: "LZ", lastContact: "1h ago", tags: ["HealthTech", "AI"] },
  { id: 7, name: "Tom Hansen", company: "BuildRight LLC", email: "tom@buildright.com", phone: "+1 555-0107", score: 55, status: "cold", stage: "Discovery", value: 18000, owner: "Mike Ross", avatar: "TH", lastContact: "1w ago", tags: ["Construction"] },
  { id: 8, name: "Anita Patel", company: "EduSpark", email: "anita@eduspark.com", phone: "+1 555-0108", score: 71, status: "warm", stage: "Qualified", value: 34000, owner: "Priya Nair", avatar: "AP", lastContact: "2d ago", tags: ["EdTech", "SaaS"] },
  { id: 9, name: "Carlos Ruiz", company: "LogiFlow", email: "carlos@logiflow.com", phone: "+1 555-0109", score: 83, status: "warm", stage: "Proposal", value: 56000, owner: "James Wu", avatar: "CR", lastContact: "4h ago", tags: ["Logistics", "B2B"] },
  { id: 10, name: "Sophie Martin", company: "CreativeWave", email: "sophie@creativewave.fr", phone: "+1 555-0110", score: 67, status: "warm", stage: "Discovery", value: 22000, owner: "Aisha Patel", avatar: "SM", lastContact: "3d ago", tags: ["Agency", "Creative"] },
];

export const customers = [
  { id: 1, name: "Nexus Systems", contact: "James Wilson", email: "james@nexussys.com", phone: "+1 555-1001", value: 245000, segment: "Enterprise", health: 92, since: "Jan 2022", status: "active", avatar: "NS", nextRenewal: "Dec 2025" },
  { id: 2, name: "BrightPath Co", contact: "Emma Davis", email: "emma@brightpath.com", phone: "+1 555-1002", value: 87000, segment: "SMB", health: 78, since: "Mar 2022", status: "active", avatar: "BP", nextRenewal: "Mar 2025" },
  { id: 3, name: "Apex Analytics", contact: "Nathan Lee", email: "nlee@apexanalytics.io", phone: "+1 555-1003", value: 312000, segment: "Enterprise", health: 96, since: "Sep 2021", status: "active", avatar: "AA", nextRenewal: "Sep 2025" },
  { id: 4, name: "GreenLeaf Corp", contact: "Olivia Brown", email: "olivia@greenleaf.com", phone: "+1 555-1004", value: 54000, segment: "SMB", health: 61, since: "Jun 2023", status: "at-risk", avatar: "GL", nextRenewal: "Jun 2025" },
  { id: 5, name: "CloudBurst Inc", contact: "Ethan Park", email: "epark@cloudburst.io", phone: "+1 555-1005", value: 178000, segment: "Enterprise", health: 88, since: "Feb 2022", status: "active", avatar: "CB", nextRenewal: "Feb 2026" },
  { id: 6, name: "Pinnacle Media", contact: "Ava Johnson", email: "ava@pinnaclemedia.com", phone: "+1 555-1006", value: 45000, segment: "Agency", health: 74, since: "Nov 2023", status: "active", avatar: "PM", nextRenewal: "Nov 2025" },
  { id: 7, name: "SkyNet Robotics", contact: "Liam Zhang", email: "liam@skynetrobotics.ai", phone: "+1 555-1007", value: 520000, segment: "Enterprise", health: 99, since: "Apr 2020", status: "champion", avatar: "SR", nextRenewal: "Apr 2026" },
  { id: 8, name: "FoodTech Labs", contact: "Mia Torres", email: "mia@foodtechlabs.com", phone: "+1 555-1008", value: 38000, segment: "Startup", health: 55, since: "Aug 2024", status: "at-risk", avatar: "FT", nextRenewal: "Aug 2025" },
];

export const deals = [
  // Discovery
  { id: 1, name: "CRM Implementation", company: "TechNova Inc.", value: 45000, probability: 20, stage: "Discovery", owner: "Sarah Chen", daysInStage: 3, avatar: "TN" },
  { id: 2, name: "Analytics Suite", company: "StartupHub", value: 12000, probability: 15, stage: "Discovery", owner: "James Wu", daysInStage: 7, avatar: "SH" },
  // Qualified
  { id: 3, name: "Enterprise License", company: "CloudScale", value: 128000, probability: 40, stage: "Qualified", owner: "Mike Ross", daysInStage: 5, avatar: "CS" },
  { id: 4, name: "Sales Automation", company: "EduSpark", value: 34000, probability: 45, stage: "Qualified", owner: "Priya Nair", daysInStage: 2, avatar: "ES" },
  // Proposal
  { id: 5, name: "FinTech CRM", company: "FinEdge Corp", value: 95000, probability: 65, stage: "Proposal", owner: "Priya Nair", daysInStage: 8, avatar: "FE" },
  { id: 6, name: "AI Integration", company: "HealthTech AI", value: 128000, probability: 70, stage: "Proposal", owner: "Sarah Chen", daysInStage: 4, avatar: "HA" },
  { id: 7, name: "Logistics Platform", company: "LogiFlow", value: 56000, probability: 60, stage: "Proposal", owner: "James Wu", daysInStage: 6, avatar: "LF" },
  // Negotiation
  { id: 8, name: "Retail Suite Pro", company: "RetailPro", value: 67000, probability: 80, stage: "Negotiation", owner: "Aisha Patel", daysInStage: 12, avatar: "RP" },
  { id: 9, name: "Enterprise Expansion", company: "Nexus Systems", value: 245000, probability: 85, stage: "Negotiation", owner: "Sarah Chen", daysInStage: 9, avatar: "NS" },
  // Closed Won
  { id: 10, name: "Annual Contract", company: "Apex Analytics", value: 312000, probability: 100, stage: "Closed Won", owner: "Priya Nair", daysInStage: 0, avatar: "AA" },
  { id: 11, name: "SkyNet Deal", company: "SkyNet Robotics", value: 520000, probability: 100, stage: "Closed Won", owner: "Sarah Chen", daysInStage: 0, avatar: "SR" },
];

export const tasks = [
  { id: 1, title: "Follow up with TechNova on demo feedback", priority: "high", due: "Today 3:00 PM", assignee: "Sarah Chen", status: "pending", tags: ["Follow-up", "Demo"], company: "TechNova Inc." },
  { id: 2, title: "Prepare Q4 revenue forecast presentation", priority: "high", due: "Tomorrow 10:00 AM", assignee: "Mike Ross", status: "in-progress", tags: ["Report", "Finance"], company: "Internal" },
  { id: 3, title: "Send contract to RetailPro legal team", priority: "medium", due: "Today 5:00 PM", assignee: "Aisha Patel", status: "pending", tags: ["Legal", "Contract"], company: "RetailPro" },
  { id: 4, title: "Update CRM data for FinEdge Corp", priority: "low", due: "Dec 28", assignee: "James Wu", status: "completed", tags: ["Data", "Admin"], company: "FinEdge Corp" },
  { id: 5, title: "Schedule onboarding call - HealthTech AI", priority: "high", due: "Tomorrow 2:00 PM", assignee: "Priya Nair", status: "pending", tags: ["Onboarding"], company: "HealthTech AI" },
  { id: 6, title: "Review and sign Apex Analytics renewal", priority: "medium", due: "Dec 30", assignee: "Sarah Chen", status: "in-progress", tags: ["Renewal", "Legal"], company: "Apex Analytics" },
  { id: 7, title: "Create email campaign for Q1 product launch", priority: "medium", due: "Jan 3", assignee: "Mike Ross", status: "pending", tags: ["Marketing", "Email"], company: "Internal" },
  { id: 8, title: "Conduct win/loss analysis for Q4 deals", priority: "low", due: "Jan 5", assignee: "James Wu", status: "pending", tags: ["Analysis", "Report"], company: "Internal" },
];

export const teamMembers = [
  { id: 1, name: "Sarah Chen", role: "Senior AE", email: "sarah@aicrmpro.com", avatar: "SC", deals: 28, revenue: 124000, target: 130000, performance: 95, status: "online", joined: "Jan 2022" },
  { id: 2, name: "Mike Ross", role: "Account Manager", email: "mike@aicrmpro.com", avatar: "MR", deals: 22, revenue: 98000, target: 100000, performance: 98, status: "online", joined: "Mar 2022" },
  { id: 3, name: "Priya Nair", role: "Senior AE", email: "priya@aicrmpro.com", avatar: "PN", deals: 31, revenue: 142000, target: 140000, performance: 101, status: "away", joined: "Sep 2021" },
  { id: 4, name: "James Wu", role: "BDR", email: "james@aicrmpro.com", avatar: "JW", deals: 19, revenue: 87000, target: 90000, performance: 97, status: "online", joined: "Jun 2022" },
  { id: 5, name: "Aisha Patel", role: "Account Executive", email: "aisha@aicrmpro.com", avatar: "AP", deals: 26, revenue: 115000, target: 120000, performance: 96, status: "offline", joined: "Nov 2022" },
  { id: 6, name: "Daniel Park", role: "Sales Engineer", email: "daniel@aicrmpro.com", avatar: "DP", deals: 14, revenue: 68000, target: 70000, performance: 97, status: "online", joined: "Feb 2023" },
];

export const whatsappConversations = [
  { id: 1, contact: "Alex Morgan", company: "TechNova Inc.", message: "Sounds great! Can you send the contract today?", time: "2m ago", unread: 2, status: "active", avatar: "AM" },
  { id: 2, contact: "Ryan O'Brien", company: "RetailPro", message: "We're ready to move forward with the enterprise plan.", time: "15m ago", unread: 0, status: "active", avatar: "RO" },
  { id: 3, contact: "Lisa Zhang", company: "HealthTech AI", message: "Please schedule a call with our CTO this week.", time: "1h ago", unread: 1, status: "active", avatar: "LZ" },
  { id: 4, contact: "David Chen", company: "FinEdge Corp", message: "The proposal looks good, few questions about pricing.", time: "3h ago", unread: 0, status: "active", avatar: "DC" },
  { id: 5, contact: "Maria Garcia", company: "StartupHub", message: "Thanks for the demo, very impressive!", time: "Yesterday", unread: 0, status: "inactive", avatar: "MG" },
];

export const emailCampaigns = [
  { id: 1, name: "Q4 Product Announcement", status: "sent", sent: 2847, opened: 1423, clicked: 342, bounced: 28, openRate: 49.98, clickRate: 12.01, date: "Dec 20, 2025" },
  { id: 2, name: "Holiday Special Offer", status: "sent", sent: 4521, opened: 1897, clicked: 523, bounced: 45, openRate: 41.96, clickRate: 11.56, date: "Dec 18, 2025" },
  { id: 3, name: "Enterprise Year-End Review", status: "scheduled", sent: 0, opened: 0, clicked: 0, bounced: 0, openRate: 0, clickRate: 0, date: "Dec 28, 2025" },
  { id: 4, name: "Q1 2026 Roadmap Preview", status: "draft", sent: 0, opened: 0, clicked: 0, bounced: 0, openRate: 0, clickRate: 0, date: "Jan 5, 2026" },
  { id: 5, name: "Black Friday Flash Sale", status: "sent", sent: 6234, opened: 3456, clicked: 812, bounced: 62, openRate: 55.44, clickRate: 13.02, date: "Nov 29, 2025" },
];

export const invoices = [
  { id: "INV-2025-001", client: "SkyNet Robotics", amount: 520000, status: "paid", date: "Dec 1, 2025", due: "Dec 31, 2025" },
  { id: "INV-2025-002", client: "Apex Analytics", amount: 312000, status: "paid", date: "Dec 5, 2025", due: "Jan 5, 2026" },
  { id: "INV-2025-003", client: "Nexus Systems", amount: 245000, status: "pending", date: "Dec 15, 2025", due: "Jan 15, 2026" },
  { id: "INV-2025-004", client: "CloudBurst Inc", amount: 178000, status: "pending", date: "Dec 18, 2025", due: "Jan 18, 2026" },
  { id: "INV-2025-005", client: "BrightPath Co", amount: 87000, status: "overdue", date: "Nov 15, 2025", due: "Dec 15, 2025" },
  { id: "INV-2025-006", client: "GreenLeaf Corp", amount: 54000, status: "overdue", date: "Nov 20, 2025", due: "Dec 20, 2025" },
];

export const activityFeed = [
  { id: 1, type: "deal", text: "SkyNet Robotics deal closed — $520,000", time: "5m ago", icon: "trophy", color: "emerald" },
  { id: 2, type: "lead", text: "New lead: Lisa Zhang from HealthTech AI", time: "18m ago", icon: "user-plus", color: "blue" },
  { id: 3, type: "email", text: "Q4 campaign sent to 2,847 contacts", time: "1h ago", icon: "mail", color: "purple" },
  { id: 4, type: "task", text: "Task completed: Apex Analytics renewal", time: "2h ago", icon: "check-circle", color: "cyan" },
  { id: 5, type: "meeting", text: "Call scheduled with RetailPro — Tomorrow 2PM", time: "3h ago", icon: "calendar", color: "amber" },
  { id: 6, type: "deal", text: "Nexus Systems moved to Negotiation", time: "4h ago", icon: "trending-up", color: "blue" },
  { id: 7, type: "customer", text: "BrightPath Co renewal reminder sent", time: "Yesterday", icon: "bell", color: "rose" },
];
