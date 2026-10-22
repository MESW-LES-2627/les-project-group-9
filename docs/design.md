eweliette — Design Documentation

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
