# Minting Ratio Logic

Both collateral modules derive gross `slisBNBx` from BNB-equivalent collateral value. Before final distribution, two sequential adjustments are applied:

1. Collateral discount
2. Lista DAO performance fee

## Step 1: Collateral Discount

| Collateral Module | Discount Rate | Effect |
| --- | --- | --- |
| `slisBNB` (via `SlisBNBProvider`) | `0%` | Full BNB-equivalent value is used as mint base. |
| `slisBNB/BNB LP` (via `SmartProvider`) | `0.2%` | LP BNB-equivalent value is multiplied by `0.998` before fee. |

## Step 2: Performance Fee (Lista DAO)

| Collateral Module | Performance Fee | Fee Basis |
| --- | --- | --- |
| `slisBNB` (via `SlisBNBProvider`) | `3%` | Applied to full BNB-equivalent value. |
| `slisBNB/BNB LP` (via `SmartProvider`) | `1.8367%` | Applied to discounted (`0.998x`) BNB-equivalent value. |

## Formula

### `slisBNB` module

```text
gross slisBNBx = slisBNB deposited x slisBNB/BNB exchange rate
Lista fee      = gross slisBNBx x 3%
user slisBNBx  = gross slisBNBx x 97%
```

### `slisBNB/BNB LP` module

```text
gross slisBNBx = LP BNB-equivalent x (1 - 0.2%) = LP value x 0.998
Lista fee      = gross slisBNBx x 1.8367%
user slisBNBx  = gross slisBNBx x (1 - 1.8367%)
```
