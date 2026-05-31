# Product/Entry two-level inventory model

We split the concept of a food "item" into two entities: **Product** (the abstract food type — milk, eggs, butter) and **Entry** (a specific quantity in a compartment with its own expiry date). Each purchase creates a new Entry under an existing Product rather than incrementing a single quantity field.

This means the same food purchased twice results in two Entries that are aggregated for display but tracked independently for expiry and usage history. The alternative — a single row with a running total — makes expiry dates ambiguous (which milk expires when?) and loses purchase granularity. The trade-off is slightly more complex aggregation queries and a two-level UI (list shows Products, detail shows Entries), but it correctly models how food actually works in a kitchen and enables accurate FEFO (First Expired, First Out) deduction and per-entry waste tracking.
