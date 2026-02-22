import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const vin = request.nextUrl.searchParams.get("vin");
  if (!vin || vin.length !== 17) {
    return NextResponse.json({ error: "VIN must be 17 characters" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`,
      { next: { revalidate: 86400 } }
    );
    const data = await res.json();
    const r = data.Results?.[0];

    if (!r || !r.Make) {
      return NextResponse.json({ error: "Could not decode VIN" }, { status: 404 });
    }

    return NextResponse.json({
      vin,
      year: r.ModelYear || "",
      make: r.Make || "",
      model: r.Model || "",
      trim: r.Trim || "",
      body_class: r.BodyClass || "",
      drive_type: r.DriveType || "",
      engine: `${r.DisplacementL || ""}L ${r.EngineCylinders || ""}cyl ${r.FuelTypePrimary || ""}`.trim(),
      transmission: r.TransmissionStyle || "",
      doors: r.Doors || "",
      plant_country: r.PlantCountry || "",
    });
  } catch {
    return NextResponse.json({ error: "VIN decode failed" }, { status: 500 });
  }
}
