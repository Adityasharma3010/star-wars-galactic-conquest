# Force and Galactic events

The current Galactic Conquest map has **24 event cards: 12 Force and 12 Galactic**. Landing on a matching event sector draws a card from that shuffled deck. Used cards return when the discard pile is reshuffled; detention escape cards stay with their holder until used.

The event resolves when drawn. The recipient's **Continue mission** button dismisses the briefing; it does not charge or award the effect again. Other players receive an informational transmission and do not need to accept the mission. AI commanders resolve their cards without a human accepting them.

## Force events

| ID  | Event                     | Story and gameplay meaning                                                                                                                                                                                      |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| f1  | The Force is with you     | An unexpected ally rewards your courage. Receive **100 credits** from the bank.                                                                                                                                 |
| f2  | A new hyperspace route    | Your navigator finds a safe route home. Move forward to **Hyperspace (sector 0)**. Receive the match's starting bonus when crossing it; the normal bonus is **200 credits**.                                    |
| f3  | Imperial interception     | An Imperial patrol captures your ship. Go directly to **detention (sector 10)**, without a Hyperspace bonus. Your doubles and extra turn are cleared.                                                           |
| f4  | Jedi intervention         | A Jedi helps you escape. Keep a **detention release card** for a future visit. It can also be included in a trade.                                                                                              |
| f5  | Cloud City rendezvous     | Meet your contact on **Bespin (sector 21)**. Move forward and resolve that property normally: acquisition or auction if unowned, rent if owed. Collect the starting bonus if the journey crosses Hyperspace.    |
| f6  | A ship in the shadows     | Travel forward to the **nearest transport**. If rent is owed, pay **twice its usual transport rent**. An unowned transport can be acquired or auctioned normally. Crossing Hyperspace gives the starting bonus. |
| f7  | Hyperdrive malfunction    | Your ship needs repairs. Pay the bank **50 credits**.                                                                                                                                                           |
| f8  | A step into the unknown   | Correct your course by moving **back three sectors**. Resolve the destination normally, including any new event card. Backward movement gives no Hyperspace bonus.                                              |
| f9  | Rebel supply mission      | Deliver medical supplies to **Yavin 4 (sector 14)**. Move forward and resolve that property normally. Collect the starting bonus if you cross Hyperspace.                                                       |
| f10 | Infrastructure inspection | Inspect all your developed worlds. Pay **25 credits per outpost** and **100 per planetary base**. A base is charged as one base, not as four additional outposts.                                               |
| f11 | Alliance solidarity       | Your allies contribute to your cause. **Every other active player pays you 50 credits**, including teammates.                                                                                                   |
| f12 | A costly favor            | Your network of contacts calls in favors. **Pay every other active player 50 credits**, including teammates.                                                                                                    |

## Galactic events

| ID  | Event                  | Story and gameplay meaning                                                                                                                         |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| g1  | Trade winds            | Your cargo arrives ahead of schedule. Receive **200 credits** from the bank.                                                                       |
| g2  | Imperial inspection    | Your cargo paperwork fails inspection. Pay the bank **100 credits**.                                                                               |
| g3  | Salvage contract       | Your salvage expedition succeeds. Receive **50 credits** from the bank.                                                                            |
| g4  | A discreet escape      | Keep a **detention release card** for your next detention visit, or trade it to another player.                                                    |
| g5  | Restricted airspace    | Your flight clearance is revoked. Go directly to **detention (sector 10)**, without a Hyperspace bonus. Your doubles and extra turn are cleared.   |
| g6  | Return to the fleet    | Rejoin your fleet at **Hyperspace (sector 0)**. Move forward and receive the match's starting bonus when crossing it; normally **200 credits**.    |
| g7  | New trade agreement    | A new market opens after your negotiations. Receive **100 credits** from the bank.                                                                 |
| g8  | Fleet maintenance      | Maintain your developed worlds. Pay **40 credits per outpost** and **115 per planetary base**. Each base replaces the outpost charge on its world. |
| g9  | Medical droid services | Pay the bank **50 credits** for your crew's medical care.                                                                                          |
| g10 | Transmission bonus     | Your communications network earns income. Receive **25 credits** from the bank.                                                                    |
| g11 | Allies answer          | Your allies respond to your transmission. **Every other active player pays you 10 credits**, including teammates.                                  |
| g12 | Docking fee refund     | An accounting mistake is corrected. Receive **20 credits** from the bank.                                                                          |

## Details that affect the result

- **Custom starting bonus:** cards that take you across Hyperspace use the configured starting bonus, not a fixed 200 credits. They do not award a second bonus for landing there.
- **Rent exemptions:** property and transport rent follow the normal rules. You do not pay yourself, rent on a mortgaged asset, or a teammate when the team rent exemption is enabled. “Twice rent” on f6 applies only when transport rent is actually owed.
- **Repairs example:** three outposts and one planetary base cost **175 credits** for f10, or **235 credits** for g8. Undeveloped worlds cost nothing.
- **Payments and debt:** if a player cannot afford a required payment, the game enters debt resolution. They can raise funds through the available financing actions or declare bankruptcy. A payment to each player is processed in player order; bankruptcy can affect later payments.
- **Bank charges and Free Orbit:** when the custom Free Orbit pot rule is enabled, payments made to the bank feed that pot. Direct payments to other commanders do not.
- **Escape cards:** choosing the release-card detention action consumes one held card and returns it to its deck's discard pile. Drawing the card does not teleport you out of a different event or grant an extra turn.
- **Names and teams:** these cards use the players in the active match. Bankrupt players are excluded from “each other player” payments. Those payments include active teammates even though normal team rent is exempt.

The titles and values above come from [the event deck](src/game/cards/decks.js); their behavior comes from [the game engine](src/game/engine/game.js). This guide covers the available **Star Wars** map. The **Default** category currently has no playable map or event deck.
