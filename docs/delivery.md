Delivery uses Google Maps Places API (New) for address suggestions and Routes API for driving distance. Pickup works without Google Maps configuration; delivery requires a successful quote.

Set GOOGLE_MAPS_API_KEY in Netlify environment variables for the server runtime, then redeploy. Enable billing, Places API (New), and Routes API in its Google Cloud project. Restrict the key to those APIs. The key is used only on the server; no browser key is needed.

The default route origin is Pentecost Street 24, Gbawe, Accra, Ghana. For precise shop routing, set GOOGLE_MAPS_ORIGIN_PLACE_ID to the shop's Google Maps place ID. Verify this origin before accepting delivery orders.

Edit DELIVERY_RANGES in src/lib/delivery.ts to change distance bands and fees. Fees are in pesewas (100 = GH₵1). The initial bands are up to 3 km for GH₵10, over 3 up to 5 km for GH₵15, and over 5 up to 8 km for GH₵25. Addresses beyond the last band cannot order delivery. Distances use road routes, not straight lines, and pricing uses the unrounded distance.

Checkout displays a quote and the server recalculates it before saving the order and initializing payment. The canonical Google address and actual delivery fee are saved using existing order fields. API failures do not fall back to a flat fee. Address searches are limited to Ghana. Existing minimum food subtotal requirements still apply.
