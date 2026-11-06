# Jeweliette — Design Documentation
#### Beatriz Oziel de Lima - 202510621

- [Iteration 0](#iteration-0)
- [Iteration 1](#iteration-1)

---

# Iteration 0

## 1. Project Overview

Jeweliette is an e-commerce application for fashion jewelry. The project explores personalized product recommendations based on customer preferences and favorite products.

## 2. EventStorming

<img width="1743" height="896" alt="DOO - ITERATION 0 - Jeweliette" src="https://github.com/user-attachments/assets/ffc06b39-1b85-4e0e-a464-e6e5b91b0dd5" />

### Main Business Processes

- Creating a customer style profile.
- Adding products to favorites.
- Generating personalized product recommendations.
- Retrieving best-selling products when no similar products are found.

### Business Rules

- Customer favorites can be used to personalize product recommendations.
- Best-selling products may be presented when no similar products are found.
- The exact timing and trigger for generating recommendations remain undecided.

## 3. Domain Model

<img width="898" height="396" alt="Jeweliette - Iteration 0 - Domain model" src="https://github.com/user-attachments/assets/b069e5ba-c544-4f3f-9637-65e5728e642b" />

### Main Domain Classes

- `Customer`
- `Product`
- `StyleProfile`
- `Favorite`
- `RecommendationSet`
- `Recommendation`

## 4. Diagram

<img width="770" height="252" alt="Jeweliette - Iteration 0 - Diagram" src="https://github.com/user-attachments/assets/ba905346-bfb9-4235-8d7e-b98e9534dbcc" />

## 5. Technology Choices

- **Shopify Hydrogen:** Proposed storefront framework.
- **React Router:** Used by the selected Hydrogen stack.
- **TypeScript:** Proposed programming language.

The technology choices and their suitability for the course requirements must be validated with the professors.

---

# Iteration 1

## 1. Domain Model


## 2. Component Diagram

## 3. Future Change Scenario
### Add a new Trending Page

As analyzed for jewerly store, the plans is to introduce a dedicated Trending Page where customers can explore the most produts, the news, and most recent/popular products in Jeweliette.

The page will be on the nav bar and will display the best-selling products (from Shopify), allowing customer to discover popular items without relying on personalized recommendations.

The proposed change would extend this existing functionality by making trending products accessible through a dedicated page.

### Affected Components

Storefront UI - Add a new page (already on the nav bar)

Server Routes (API) - New route to obtain the most selling products and the newest ones

Shopify Platform - Give the products data and all information to identify trends

Recoomendation Engine - It wont be changed, is not the same thing as recommendation page

## 4. Coupling and Cohesion Analysis

### 4.1 Coupling Analysis
We have already the Recommendation Engine that acts very similar as the future Trending Page - however, it will have differnts responsabilities.

Recommendation Engine: Focuses on generating personalized recommendations based on customer preferences

Trending Page: Focuses on displaying pupular products based on sales data in genereal

Making the Trending Page depend directly on the Recommendation Engine would create unnecessary coupling between two distinct functionalities. If we use Recommendation Engine for the Tranding Page, changes in the recommendation logic could also affect the Tranding Page. Creating a separate Trending Products module would make them more independent, even though both use products from the same Shopify catalog.

### 4.2 Cohesion Analysis
Creating a separate Trending Products module would give each module a own purpose. The Recommendation Engine would be responsible for personalized recommendations, while Trending Products would show the most popular products. This makes the code more organized and easier to understand and maintain.

## 4.3 Explicit Design Decision
We will decide to create a separate module instead of adding to Recommendation engines because both functionalities have different purposes and should work independently. Both modules will still use the Shopify product catalog. This approach keeps the code more organized and makes it easier to maintain and update each feature.