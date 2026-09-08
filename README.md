# Video Wall Web Builder

Browser prototype for sizing video walls for sales review.

The first vendor profile is InfiLED DB2.6 / IL-RSS-IRDB2.6mk2. The builder fits
whole 500 mm cabinets inside the requested wall size without going over, then
calculates wall resolution, estimated processor count, signal runs, power load,
and starter hardware counts.

## Review Status

This is a first draft. The InfiLED DB2.6 cabinet size, resolution, weight,
brightness, refresh rate, and watts are based on public manufacturer specs.
Power chain limits, exact jumper counts, processor model choice, and shop cable
rules still need technical review before quoting.

## GitHub Pages

The static review version lives in:

```text
docs/
```

GitHub Pages should publish from the `main` branch using the `/docs` folder.

## Blender Handoff

The web builder's `Export JSON` button includes a `blender_layout` block. The
Blender InfiLED Video Wall Builder add-on can import that JSON and assemble the
wall using the exported columns, rows, support mode, tower spacing, H-tube
setting, and right-edge tower setting.

The `LASSO CSV` export creates a starter line-item list for sales testing. SKU
fields are intentionally blank until the exact LASSO/Intelevent inventory item
names and codes are confirmed.
