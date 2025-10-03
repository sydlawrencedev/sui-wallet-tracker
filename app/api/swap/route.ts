import { NextResponse } from "next/server";


export async function POST(request: Request, { params }: { params: { token: string } }) {

    return NextResponse.json({ error: "no longer implemented" });
}
