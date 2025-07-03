> **Source:** https://medium.com/@ListaDAO/product-update-unlocking-velista-utility-introducing-the-lisusd-borrow-rebate-mechanism-6e9592743522

---

Product Update: Unlocking veLISTA Utility: Introducing the lisUSD Borrow Rebate Mechanism
=========================================================================================

[![Lista DAO](https://miro.medium.com/v2/resize:fill:64:64/1*MjzENF0Jemedfu3G3f0-Ng.png)

](https://medium.com/@ListaDAO?source=post_page---byline--6e9592743522---------------------------------------)[Lista DAO](https://medium.com/@ListaDAO?source=post_page---byline--6e9592743522---------------------------------------)

3 min read·Mar 13, 2025

\--

Listen

Share

Lista DAO is committed to expanding the utility of veLISTA by rolling out a series of features designed to provide long-term benefits for holders. As the backbone of our governance and incentive structure, veLISTA plays a crucial role in shaping the future of the Lista DAO ecosystem. These updates are aimed at **enhancing capital efficiency, boosting user engagement, and driving sustainable growth** within the ecosystem. By holding veLISTA, users unlock exclusive financial incentives, including borrowing discounts, staking rewards, and governance privileges, all of which contribute to a **more optimized and rewarding DeFi experience**.

With a focus on long-term sustainability, we are introducing new mechanisms that maximize the value of veLISTA, ensuring that holders benefit from deeper integrations and innovative financial utilities. One of the first major enhancements to veLISTA utility is the **lisUSD Borrow Rebate Mechanism**, a feature that directly reduces borrowing costs for veLISTA holders.

Introducing the lisUSD Borrow Rebate Mechanism
==============================================

As part of this initiative, we are launching the **Borrow lisUSD Rebate Mechanism**, a new feature that directly reduces borrowing costs for veLISTA holders.

This mechanism rewards users by providing **lisUSD rebates** based on their veLISTA holdings, allowing them to optimize their borrowing experience within the Lista DAO ecosystem. With this update, eligible veLISTA holders can now **earn both lisUSD borrow rebates and LISTA emission rewards simultaneously** — further increasing their capital efficiency.

More veLISTA utility features will be announced soon, but for now, let’s break down how the borrow rebate works.

How It Works: Core Logic
========================

The borrow rebate percentage is determined based on the amount of veLISTA a user holds, following this function:

**F(x) = A \* ln(x) + B**

Where:

*   **x** = veLISTA amount held by the user
*   **ln** = natural logarithm function
*   **F(x)** = borrow rebate percentage
*   **A & B** = adjustable parameters based on market conditions, with the core Lista team making final decisions

To maintain a fair and balanced mechanism, certain thresholds apply:

*   If **x ≤ 10k veLISTA**, then **F(x) = 0%** (No rebate)
*   If **x ≥ 1000M veLISTA**, then **F(x) ≤ 5%** (Maximum rebate cap)

Current Formula
===============

Currently, the function is set as follows:

**F(x) = 0.004341 \* ln(x) — 0.03998**

This ensures a smooth distribution of rebates while maintaining a structured cap at 5%.

Rebate Calculation Examples
===========================

To illustrate how the borrow rebate mechanism works, here are three scenarios:

Example 1: No Rebate (Threshold Not Met)
========================================

*   **User A** borrows **100,000 lisUSD** at a **10% borrow rate**.
*   **User A holds 10k veLISTA**, which is below the threshold, so **no rebate applies**.
*   **Rebate rate: 0%**
*   **Weekly rebate: 0 lisUSD**

Example 2: Partial Rebate
=========================

*   **User B** borrows **100,000 lisUSD** at a **10% borrow rate**.
*   **User B holds 1M veLISTA**, applying the function:  
    **F(1,000,000) = 0.004341 × ln(1,000,000) — 0.03998  
    \= 0.004341 × 13.8155–0.03998  
    \= 0.0599–0.03998  
    \= 1.99%**
*   **Rebate rate: 1.99%**
*   **Weekly rebate calculation:  
    **(100,000 × 1.99%) / 365 × 7  
    \= (1,990 / 365) × 7  
    \= **38.2 lisUSD per week**

Example 3: Maximum Rebate Cap Reached
=====================================

*   **User C** borrows **100,000 lisUSD** at a **10% borrow rate**.
*   **User C holds 10B veLISTA**, exceeding the **1000M cap**.
*   **Rebate rate: 5% (Maximum cap applied)**.
*   **Weekly rebate calculation:  
    **(100,000 × 5%) / 365 × 7  
    \= (5,000 / 365) × 7  
    \= **96 lisUSD per week**

Moving Forward
==============

With the introduction of the lisUSD Borrow Rebate Mechanism, **Lista DAO continues to enhance the veLISTA utility**, making it even more rewarding to hold and stake. This update directly benefits users by reducing borrowing costs, increasing yield potential, and reinforcing the ecosystem’s long-term sustainability.

Stay tuned for more upcoming veLISTA utility enhancements that will further optimize your experience within the Lista DAO ecosystem.