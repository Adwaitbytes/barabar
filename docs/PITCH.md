# The five-minute video

Spoken script, timed to finish at about 4:50. Say it like you would explain it to a friend who runs a store. No slides except the two tables that are already on screen in the product.

Set up before recording: browser at 1440 wide, dark theme, zoom 110%, one tab with the live app, one terminal at the repo root with the API running on :8000. Load the demo month before you start so nothing is loading on camera.

## 0:00 to 0:25, the question

On screen: landing page, then the proof tree in the hero.

"Every founder on Razorpay has had this moment. You sold two lakh ten thousand this week. Then one lakh eighty three thousand four hundred and twelve lands in the bank. Where did the rest go? That question is the whole product. This is the answer, and every line shows the rule that proved it."

## 0:25 to 1:10, load the month

On screen: terminal, `make demo`, then the app's Close pack.

"Let me load a month. Six hundred payments, twenty two settlements, three sources: Razorpay, the HDFC statement, and the sales ledger. Thirty milliseconds. Notice the four hashes print before any match rate. Inputs, config, code, outputs. Same inputs, same hash, every single time. You can run this yourself from the repo and get the same numbers."

## 1:10 to 2:00, one proof

On screen: click a matched settlement, walk down the tree.

"Take one bank credit. It matched by the exact UTR, so tier A, confidence one. Inside it, the settlement nets to zero residual. Two hundred and eighty seven payments: gross, two percent fee, eighteen percent GST on that fee, six refunds netted, one chargeback. Every node is a rule, not an opinion. If the numbers did not foot, this would be an exception, not a match."

## 2:00 to 2:50, where I chose not to use AI

On screen: the boundary table in the guide, then the Proposed settlement, then Investigate.

"Here is the decision I am most proud of. No language model has ever decided a match in this system. Money math is code with tests. The AI only works the leftovers. This bank export cut the reference number to thirteen characters. Tier C proposed a match at point seven two and refused to link it on its own. The investigator then read the settlement, searched the bank statement, cited two pieces of evidence, and named the alternative it rejected. A human clicks accept. That click is in the audit chain."

## 2:50 to 3:35, what broke

On screen: terminal, `scripts/replay-storm.sh 50`, then `docs/FAILURES.md` entry one.

"Things broke, and I kept a log. Fifty replays of the same refund webhook: one row, forty nine duplicates ignored. And the failure I read first: my own evals said a match was wrong. I believed the matcher had linked the wrong settlement. The truth was that my ground truth was wrong. HDFC puts the RTGS reference second, so a fifty character cut left it intact and the match was correct. Truth now comes from parsing the data, never from a flag."

## 3:35 to 4:20, the evals

On screen: terminal, `make evals`, then the residual list, then the ITC figure and the Tally file.

"Regenerated live. One hundred percent precision on the exact and netted tiers at sixty, six hundred and six thousand orders. Zero rupees wrongly linked. And this residual list is the honest answer to the brief: the exceptions it could not resolve. A missing bank credit, an unknown credit, two adjustments a person has to verify. The GST on fees this month is one thousand four hundred and sixty eight rupees, and the vouchers open in Tally."

## 4:20 to 4:50, ask the books, and close

On screen: Ask the books, then the simulated versus real table.

"Last thing. Ask it how much GST input credit you can claim this month. Every figure in that answer came from a tool call, and the guard blocks anything else, including rounding. Everything you saw is in a public repo and regenerates from one command. Barabar. The books, exactly equal."
