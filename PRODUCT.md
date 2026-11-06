# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS and JavaScript. A Node script (`build.js`) fills `template.html` with the day's scan and writes `docs/index.html`, which GitHub Pages serves. No framework.

## Users

Brazilian travelers who hunt cheap fares and miles from Campinas (VCP) and São Paulo (Guarulhos GRU, Congonhas CGH), and the friends in a WhatsApp group who receive the daily top 5. They compare destinations and miles programs on a phone or a laptop, before deciding where to spend miles or cash. Inferred from the conversation, not from an interview of the group.

## Product Purpose

A list, refreshed every day at 07:00, of the lowest round-trip fares leaving Campinas and São Paulo, in cash or in miles, grouped by destination. Each option opens the airline or miles program's own search already filled with route and date, so the visitor can confirm the real price and availability. Success: pick a destination and open the right search within seconds.

## Positioning

It is not a booking site and sells nothing. It reads a paid deals app (Secret Flight Deals) and does three things that app does not: hides normal and high prices, adds up two one-way miles fares into a round trip, and shows the reais equivalent of miles beside every price.

## Operating Context

Data comes from Secret Flight Deals, class economy, scanned daily. Every miles price is the lowest published for one leg ("a partir de"), so a round trip built from two legs is a floor, not a quote. Reais for miles use each program's reference price per thousand miles (Azul 14, Smiles 15, LATAM Pass 23, Aeroplan 70, AAdvantage 90) and leave out boarding fees. Nothing is confirmed on the airline sites. A WhatsApp message with the top 5 and a link to this page goes to a group each morning.

## Capabilities and Constraints

- Two origins: Campinas, and São Paulo (GRU, CGH and the SAO city search together).
- Three kinds of offer: cash round trip, miles round trip made of two one-way fares, and a "one leg" card whose price covers one direction only.
- Filters: text search, continent, region or country, kind, miles program, maximum price, same program only. Sorting by price, miles or nearest date.
- Links: Google Flights with route and dates, and a prefilled miles search on Azul, Smiles and LATAM (LATAM asks for login first). Other programs open their home page.
- No accounts, no purchases, no photos, no data entered by visitors.
- Language: Brazilian Portuguese only.

## Brand Commitments

- Name in use: "Passagens baratas de São Paulo e Campinas".
- The user rejected, in their own words, the previous looks: dark band with monospace type, teal with glass and rounded pills, and a generic list. They asked for typography and colour only, no destination photos, and for the best of Google Flights, Skyscanner, Airbnb and Linear or Stripe without the complaints each one gets.

## Evidence on Hand

Real fares in the daily scan (`data/raw.json`, not published) and the page they produce (`docs/index.html`). Absent, and not to be invented: customer counts, testimonials, reviews, a "typical price" per route, destination photos.

## Product Principles

1. State what a price includes and what it does not, next to the price. The most common complaint about fare sites is a price that changes or grows at checkout.
2. One row per destination, cheapest first. Other fares for the same destination open inside the row.
3. Send the visitor to the program or airline to confirm. Say "resgatar" or "ver voo", never "comprar".
4. Only promotions. Normal and high prices stay hidden, and the page says how many.
5. No advertising, no urgency tricks, no clutter.

## Accessibility & Inclusion

Brazilian Portuguese. Text contrast of at least 4.5 to 1. Touch targets of at least 44 pixels on phones. Full keyboard use, visible focus, reduced motion respected. Colour never carries meaning alone: every continent colour sits beside its name.
