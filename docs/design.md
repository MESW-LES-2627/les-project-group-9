eweliette — Design Documentation

## 1. Project Overview

Jeweliette is an e-commerce application for fashion jewelry. The project explores personalized product recommendations based on customer preferences and favorite products.

## 2. EventStorming

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

### Main Domain Classes

- `Customer`
- `Product`
- `StyleProfile`
- `Favorite`
- `RecommendationSet`
- `Recommendation`

## 4. Diagram

## 5. Technology Choices

- **Shopify Hydrogen:** Proposed storefront framework.
- **React Router:** Used by the selected Hydrogen stack.
- **TypeScript:** Proposed programming language.

The technology choices and their suitability for the course requirements must be validated with the professors.
