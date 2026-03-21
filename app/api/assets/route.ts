import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await query(
      "SELECT * FROM assets ORDER BY created_at DESC",
      [],
    );

    return NextResponse.json(result.rows || []);
  } catch (error: unknown) {
    console.error("Error fetching assets:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      asset_tag,
      category,
      status,
      location,
      assigned_to,
      purchase_date,
      purchase_cost,
      notes,
    } = body;

    const result = await query(
      `INSERT INTO assets (name, asset_tag, category, status, location, assigned_to, purchase_date, purchase_cost, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        name,
        asset_tag,
        category,
        status || "active",
        location,
        assigned_to,
        purchase_date,
        purchase_cost,
        notes,
      ],
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating asset:", error);
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      asset_tag,
      category,
      status,
      location,
      assigned_to,
      purchase_date,
      purchase_cost,
      notes,
    } = body;

    const result = await query(
      `UPDATE assets SET name=$1, asset_tag=$2, category=$3, status=$4, location=$5,
       assigned_to=$6, purchase_date=$7, purchase_cost=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [
        name,
        asset_tag,
        category,
        status,
        location,
        assigned_to,
        purchase_date,
        purchase_cost,
        notes,
        id,
      ],
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    console.error("Error updating asset:", error);
    return NextResponse.json(
      { error: "Failed to update asset" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await query("DELETE FROM assets WHERE id=$1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting asset:", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 },
    );
  }
}
