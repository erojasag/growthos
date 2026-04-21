export const revalidate = 3600 // cache for 1 hour

export async function GET() {
  try {
    const res = await fetch("http://apis.gometa.org/tdc/tdc.json", {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return Response.json(
        { error: "Failed to fetch exchange rate" },
        { status: 502 }
      );
    }

    const data = await res.json();

    return Response.json({
      compra: parseFloat(data.compra),
      venta: parseFloat(data.venta),
      compraDate: data.compra_date,
      ventaDate: data.venta_date,
      updated: data.updated,
    });
  } catch {
    return Response.json(
      { error: "Exchange rate service unavailable" },
      { status: 503 }
    );
  }
}
