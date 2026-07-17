export type Notice = { id:number; title:string; category:string; body:string; date:string; important?:boolean };
export type Reminder = { id:number; title:string; kind:string; due:string; completed:boolean };
export type SupportTicket = { id:string; subject:string; department:string; status:"Open"|"In Progress"|"Resolved"|"Closed"; updated:string };

export const initialNotices: Notice[] = [
 {id:1,title:"Semester II course registration is now open",category:"Academics",body:"All continuing students should register their courses through the student portal before the deadline.",date:"18 Jul 2026",important:true},
 {id:2,title:"Fee payment deadline — August intake",category:"Finance",body:"Complete payment before 25 July to avoid a late registration charge.",date:"17 Jul 2026",important:true},
 {id:3,title:"Innovation Week 2026: call for student projects",category:"Events",body:"Submit your project proposal to the Innovation Office by 2 August 2026.",date:"16 Jul 2026"}
];
export const initialReminders: Reminder[] = [
 {id:1,title:"Fee payment deadline",kind:"Finance",due:"25 Jul 2026 · 11:59 PM",completed:false},
 {id:2,title:"Register Semester II courses",kind:"Academics",due:"29 Jul 2026 · 5:00 PM",completed:false},
 {id:3,title:"Submit research methods assignment",kind:"Assignment",due:"02 Aug 2026 · 11:59 PM",completed:false}
];
export const initialTickets: SupportTicket[] = [
 {id:"KG-1042",subject:"Transcript request follow-up",department:"Registrar",status:"In Progress",updated:"Today"},
 {id:"KG-1038",subject:"Hostel maintenance request",department:"Accommodation",status:"Open",updated:"Yesterday"}
];
