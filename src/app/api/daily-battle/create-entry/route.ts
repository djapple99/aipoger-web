import {NextResponse} from "next/server";
export async function POST(){return NextResponse.json({error:"LEGACY_UPLOAD_RETIRED",message:"請使用連結或 MP3 投稿入口。",href:"/battle/setup"},{status:410});}
