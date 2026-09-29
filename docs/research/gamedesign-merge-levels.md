# Gamedesign-Recherche: Level-basiertes 2048/Merge, Map, Charity (Agent-Report, 2026-09-29)

> Roh-Report eines Recherche-Agenten. Sprache: Englisch. Aussagen mit *(unverified)* sind nicht belegt. Kondensierte Fassung: `docs/RESEARCH.md`.

# Research report: level-based 2048 merge puzzle with evolving blobs, a world map, a guide character and a one-third charity pledge

Research date: 2026-09-29. Limits you should know about:
- The shared web-search budget ran out partway through. After that I only fetched known URLs.
- Fandom wikis, TV Tropes, most Medium posts and some press releases returned 402/403 errors.
- Anything I could not verify this session is marked **(unverified)**.

## TL;DR

- I found no well-known game that combines 2048 sliding with a level map, evolving creatures and a story. The closest are Threes (tiles are characters), Pudding Monsters (slide-and-stick blob creatures, level-based), Triple Town (an evolution chain plus creatures as blockers) and Merge Dragons (healing dead land). The gap is real. So is the risk: Naavik found that mandatory "innovative" level types in match-3 raised cognitive load and lowered engagement.
- 2048 has two structural problems that the level design has to solve:
  - **A dominant strategy.** Stacking tiles in a corner works almost every time; the Threes team argued 2048 [takes no special skill](https://en.wikipedia.org/wiki/2048_(video_game)).
  - **Exponential tile cost.** Reaching the 2048 tile takes about 930 moves (1,024 base units at roughly 1.1 units per spawn). Level goals therefore have to aim at stages 5–8 and use pre-placed blobs.
- King's 16-characteristic blocker framework maps cleanly onto a sliding grid (section 2).
- The pacing data is concrete. Royal Match marks hard levels at 39/45/49/55/65/75/85/95 (about 1.6 attempts) and super-hard levels at 59/69/79/89/99 (up to about 2.5 attempts). Normal levels take about 1.2 attempts.
- The App-Store-safe charity model is the one Terra Nil and Alba used: the studio donates its own revenue. Never sell an in-app purchase as a donation (Guideline 3.2.2(iv)).

---

## 1. Level-based 2048 and merge games

| Game | Core twist | How levels and goals work | Blockers and helpers | Hook / criticism |
|---|---|---|---|---|
| **2048** (Cirulli, 2014) | 4×4 grid, identical tiles merge; spawns are 90% "2", 10% "4" | Endless; one goal (the 2048 tile) | None | Viral. Threes' team: they rejected the merge-any-identical rule because it made the game too simple ([Wikipedia](https://en.wikipedia.org/wiki/2048_(video_game))) |
| **Threes!** (Sirvo, 2014) | 1+2=3, then doubles; preview of the next tile; tiles move one step; new tiles appear only on rows that moved | Endless, score by tile rarity | "Bonus" tiles | Metacritic 92 ([Wikipedia](https://en.wikipedia.org/wiki/Threes)). Tiles have faces and personalities. The preview and directional spawns create real planning, while "2048 plays itself" ([MakeGamesSA](https://makegamessa.com/discussion/1786/threes-2048-example-of-intrinsic-difficulty-curve-from-game-design)) |
| **2048 Variants** (iOS) | Each level is a parameter set: grid size, spawn algorithm, a maximum tile stage after which the tile disappears, special blocks | Next level unlocks when you reach a given tile | "Special blocks with fun features" | Tiny audience ([App Store](https://apps.apple.com/us/app/2048-variants-merge-puzzle/id1587855090)) |
| **Creature-skinned 2048s**: Monster Meld, ANI 2048, 2048 Koala, Evolution 2048 (bacterium → T-Rex), 2048 Cupcakes (PiKoYa) | Evolution art on top of standard 2048 | Mostly endless | Few | Evolution reveals are the hook; ad-driven ([Play](https://play.google.com/store/apps/details?id=com.npg.monstermeld), [App Store](https://apps.apple.com/us/app/evolution-2048-puzzle-deluxe/id1317482062)) |
| **Triple Town** (Spry Fox, 2010) | Place pieces, 3 identical merge: grass → bush → tree → hut… on a 6×6 board | Endless, score; island meta | **Bears wander and block. Trapped bears become gravestones → churches → cathedrals → chests.** Crystals act as wildcards; bots remove tiles | Credited as the first merge game. Turns regenerate slowly or cost money ([Wikipedia](https://en.wikipedia.org/wiki/Triple_Town), [Game World Observer](https://gameworldobserver.com/2022/11/01/spry-fox-triple-town-merge-genre-origins-netflix-acquisition)) |
| **Pudding Monsters** (ZeptoLab, 2012) | Swipe blob creatures; each slides until it hits something and sticks; all must join into one monster | 75+ levels, stars, plus a "crown" challenge | Dormant puddings, sticky/slime puddings, bumpers, ice, cloners, switches | Reviewers loved the charm but called the puzzles bland ("three obvious groups"). Delisted February 2026 ([TouchArcade](https://toucharcade.com/2013/01/04/pudding-monsters-review/), [Wikipedia](https://en.wikipedia.org/wiki/Pudding_Monsters)) |
| **Merged!** (Gram Games) | Hex board; place pieces so 3 merge | Endless | (unverified: 7 → "M" clears an area) | Polished, Facebook-social ([Gram](https://gram.gs/game-detail-merged.html)) |
| **Merge Dragons!** (Gram/Zynga, 2017) | Merge 3 (5 for a bonus); 3D isometric | **Level goals**: heal all dead land, merge 5 of item X, points; plus a camp meta | **Dead land** healed with Life Flowers/Orbs; **Zomblins** (tap to fight, leave graves) | In-level world healing. Players get stuck on large meta tasks ([wiki via search](https://mergedragons.fandom.com/wiki/Zomblins), [Gamigion](https://www.gamigion.com/a-not-so-brief-history-of-the-merge-genre/)) |
| **Merge Mansion** (Metacore, 2020) | Merge 2; generators; orders tied to a restoration story | Orders and tasks | Energy | 69% D1 and 22% D60 in Q4 2020. Criticised for energy, board space, a slow thin story and bottleneck orders ([Gamigion](https://www.gamigion.com/a-not-so-brief-history-of-the-merge-genre/), [search summary](https://www.linkedin.com/pulse/merge-mansion-game-analysis-1-daniele-siena)) |
| **EverMerge** | Fantasy merge; now published by JetSynthesys; 10M+ Play downloads; random-item purchases | (unverified: fog/curse lifting) | | [Play](https://play.google.com/store/search?q=evermerge&c=apps) |
| **2248 / X2 Blocks / Merge Hexa** (Inspired Square) | Chain-connect, drop-merge and hex-merge-3 number variants | Endless "to infinity" | | [Play](https://play.google.com/store/apps/details?id=com.inspiredsquare.jupiter&hl=en_US) |
| **Suika Game** (Aladdin X; boomed in 2023) | Physics drop-merge of 11 fruits; shows the next fruit | Endless | None | "2048 with physics". Near misses, cute faces, spread by streamers; 11M+ downloads by October 2024; clone flood ([Wikipedia](https://en.wikipedia.org/wiki/Suika_Game)) |
| **Merge Fellas** (Tapmen, 2025) | Suika-like with meme characters; many themed modes | Endless | | 11.3M downloads by June 2025, driven by VTubers ([wiki](https://italianbrainrot.wikioasis.org/wiki/Merge_Fellas)) |

For "rescue N creatures" goals, the best reference is **World of Goo**: each level needs a minimum number of goo balls delivered to the pipe, and surplus balls feed a global tower meta ([Wikipedia](https://en.wikipedia.org/wiki/World_of_Goo)).

Could not verify or not relevant:
- **Cell Connect** exists (BoomBit, 4.8★) but its details could not be retrieved.
- **Puzzle Blossom** and **Imagine 2048**: not found.
- **"Trees"**: possibly a reference to Triple Town's grass→bush→tree chain.
- **Bloons** is tower defence, not merge.

**Takeaways**
1. **Break the corner strategy:**
   - Use irregular boards and interior rocks, which create new walls and therefore new merge sites.
   - Put targets in the centre. Tiles always slide to walls, so edge targets are easy and centre targets are hard.
2. **Borrow Threes' next-spawn preview and directional spawning.** They give casual players control without making the game harder.
3. **Let top-stage blobs "graduate" and leave the board** (2048 Variants' disappearing max stage, World of Goo's pipe). This relieves clogging and makes "evolve and release" the fantasy.
4. **Avoid what critics punish:** energy walls (Best Fiends, Merge Mansion), charming but shallow puzzles (Pudding Monsters), stalled meta.

## 2. Blockers, special pieces and level pacing

**Special pieces**
- **Candy Crush:** four or more in a match creates a special ([Wikipedia](https://en.wikipedia.org/wiki/Candy_Crush_Saga)). Striped = 4 in a line (clears a row/column), wrapped = L/T shape (area blast), colour bomb = 5 (clears one colour); specials combine. Those creation rules are common knowledge rather than verified this session.
- **Royal Match:** rocket, propeller, TNT and light ball. The game never forces you to use a power-up, and the propeller re-targets to help the player ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey)).
- **Toon Blast:** tap groups to make rocket, bomb and disco ball (unverified).
- **Best Fiends:** matching a colour charges that fiend's ability, either a bomb or a converter. Temper's is a horizontal bomb ([Gamezebo](https://www.gamezebo.com/walkthroughs/best-fiends-tips-cheats-strategies/)).

**Blockers**

Candy Crush first appearances in the current level order ([cheats4game](https://cheats4game.com/candy-crush-saga-blockers/)):

| Element | First level |
|---|---|
| Multi-layer frosting (meringue) | ~2 |
| Jelly | 6 |
| Ingredients | 11 |
| Marmalade | 11 |
| Licorice lock | 21 |
| Licorice swirl | 36 |
| Candy bomb (countdown) | 96 |
| Chocolate (spreads) | 141 (older sources cite 51) |
| Chocolate fountain | 186 |
| Bubblegum pop | 261 |
| Toffee swirl | 351 |
| Cake bomb (2×2, 8 hits) | 441 |
| Sugar chest + key | 486 |
| Magic mixer (spawns blockers) | 1055 |

Later additions include fences between cells, sugar coat, order locks and dark chocolate. King has reordered its early episodes over the years, so treat these numbers as approximate.

- **Best Fiends:** slugs are HP enemies, and excess damage carries over to the next one. Obstacles: twigs (1 hit), snow, ooze-covered tiles, crates (multi-hit), and black bombs that only fiend bombs can trigger. Goals: collect a colour, defeat slugs, chain length, crates ([Gamezebo](https://www.gamezebo.com/walkthroughs/best-fiends-tips-cheats-strategies/)).
- **Royal Match:** boxes (levels 1–3), grass (4–6), vases, royal eggs ([Wikipedia](https://en.wikipedia.org/wiki/Royal_Match)).

**King's blocker framework** (Lucien Chen, GDC 2020, [PDF](https://media.gdcvault.com/gdcsummer2020/presentations/GDC2020%20Final%20PPT.pdf)). It treats blockers as the enemies of casual games, with 16 characteristics in 4 groups:
- **Nature:** colourless / coloured / layered / single (one hit) / space (larger than 1×1)
- **Movement:** stationary / locked / movable
- **Discovery:** chained / hiding / dynamic
- **Destruction:** removable / irremovable / match-beside / match-on / impenetrable

Findings from the talk:
- The most common set is **stationary, colourless, layered, removable, match-beside**.
- Layers give positive feedback on progress.
- Match-beside is far more reachable than match-on: 104 vs 44 possible match configurations.
- There are four difficulty levers: blockers, **spawn rate** (4/5/6 colours, special and objective spawn frequency), **design style** (explosive / snipey / journey / puzzly / grindy) and **layout** (open vs narrow, empty cells, multi-screen).

**Pacing data**

| Source | Data |
|---|---|
| Royal Match ([Gamigion](https://www.gamigion.com/royal-match-level-design-insights/), [Medium via search](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b)) | Normal ≈1.2 attempts; hard ≈1.6; super-hard ≈2.5 (positions in TL;DR). Moves: 30–38 (levels 1–20), 25–30 (21–60), 23–27 (61–100). New areas at 1/10/21/41/61/81. Boosters unlock at 8/14/17/19. Free "victory lap" levels every 10 levels. A new obstacle every 10 levels from 21; the intro level is easier and contains only the new obstacle ("learn → test → celebrate"). Hard levels are labelled explicitly |
| Candy Crush ([Wikipedia](https://en.wikipedia.org/wiki/Candy_Crush_Saga), [fandom via search](https://candycrush.fandom.com/wiki/Map)) | Episodes of 15 levels, except the two shorter tutorial episodes. 5 lives, one back every 30 minutes |
| Two Dots ([Wikipedia](https://en.wikipedia.org/wiki/Two_Dots_(video_game))) | World 1 = 10 levels; later worlds 25+ |
| Plants vs. Zombies ([George Fan, GDC 2012](https://notes.hamatti.org/sources/talks/how-i-got-my-mom-to-play-through-plants-vs.-zombies)) | A new feature roughly every 5 levels; about 8 words on screen at a time |
| Playrix ([Game World Observer](https://gameworldobserver.com/2019/09/27/playrix-levels-elements-match-3)) | Gardenscapes had 16 mechanics over 300 levels at soft launch. At most 3–4 element types per level. Each level needs "an idea". Every level must be beatable without boosters. Never run several levels in a row at 92–95% difficulty. A/B-test replacements for dropout levels (level 77 had 2.29% dropout) |
| King ([mobilegamer.biz](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)) | Measure fun separately from difficulty (time to abandon, time to pass). "If a level is really hard, it should also be really short." King redesigns its 100 least-engaging levels; "retention always wins". Bots pre-test every level ([mobilegamer.biz](https://mobilegamer.biz/how-king-balances-human-and-ai-powered-design-in-candy-crush-saga/)) |
| Room 8 ([article](https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/)) | Track average/median attempts rather than pass rate. Don't repeat an idea within about 50 levels. Level types: tutorial, "fuu" (1–2 moves short), comfort, skill |
| Lily's Garden ([arXiv](https://arxiv.org/html/2401.17436v1)) | About 3.2 attempts on average after the tutorial; long tail of 30+ attempts |
| Saw-tooth ([Elimination paper](https://arxiv.org/abs/1905.06379)) | Difficulty rises for 5 levels, drops on the 6th |

The "60–65% win-rate target" was **not found as a published number**. It is consistent with Royal Match's hard levels: 1.6 attempts is roughly a 62% win rate per attempt. By the same arithmetic, normal levels are about 83% and super-hard about 40%.

Naavik warns that mandatory "innovative" level types (battle, heist) raise cognitive load. Royal Kingdom earns about $15 revenue per download against Royal Match's $25 ([Naavik](https://naavik.co/f2p-mobile/why-innovative-match-3-levels-is-not-a-usp/)).

**Teaching without text**
- George Fan's rules for Plants vs. Zombies: have the player do it, not read it; get them to do it once; adaptive messaging; teach with visuals.
- Nintendo's **kishōtenketsu** (Hayashida): introduce, develop, twist, conclude, all inside one level ([Game Developer](https://www.gamedeveloper.com/design/the-structure-of-fun-learning-from-i-super-mario-3d-land-i-s-director)).

## 3. World map, meta and guide characters

**Maps and meta in the reference games**
- **Candy Crush:** started as a single continuous 2D trail, later a 3D pop-up board. Each episode brings new characters, a cutscene and map art. Tiffi is the heroine and Mr. Toffee the tutorial guide. Saga Adventures run 60 levels with 4 story milestones and are designed **level-first**: a difficulty spike becomes a "boss chapter" ([PocketGamer.biz](https://www.pocketgamer.biz/how-saga-adventures-make-candy-crush-a-living-breathing-universe/)).
- **Best Fiends:** the map is Temper's journey across Minutia (Green Glades → Frozen Hills at level 21 → … → Mount Boom). Level objectives show on the map before play; new fiends are rescued from crates with keys; there are boss slugs ([bestfiends.com](https://www.bestfiends.com/story), [Gamezebo](https://www.gamezebo.com/walkthroughs/best-fiends-tips-cheats-strategies/)). Critics praised the characters and hated the energy system: 20 "jolts", more than 3 hours to refill ([Gamezebo review](https://www.gamezebo.com/reviews/best-fiends-review-with-fiends-like-these/)). Camera and node details are (unverified).
- **Homescapes:** stars from levels buy renovation tasks; Austin's dialogue plays like a visual novel ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/homescapes-monetization)).
- **Royal Match:** "puzzle & decorate lite" around King Robert ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey)).

**Guide cadence.** One pattern across these games, and my recommendation for yours:
- micro-lines (8 words or fewer) on new mechanics;
- a short scene every 5–10 levels;
- a chapter cutscene every 10–15 levels;
- a big emotional beat (rescue, reunion) at each chapter finale.

**Rotatable globes**
- **Super Mario Odyssey:** the ship's globe is the kingdom-select menu ([MarioWiki](https://www.mariowiki.com/Earth)).
- **Before We Leave:** planets are hex spheres with 12 hidden pentagons ([PC Gamer via search](https://www.pcgamer.com/before-we-leave-review/)).
- **TerraGenesis:** the planet visibly fills with oceans, clouds and life ([App Store](https://apps.apple.com/us/app/terragenesis-space-settlers/id1039841501)).
- **Planet Picker:** a mobile puzzle played on a globe ([App Store](https://apps.apple.com/mx/app/planet-picker/id6745899539)).
- Kingdom Rush, Mini Metro, Alba and Planet Coaster do not use globes (from general knowledge).

**Takeaway:** use the globe for chapter selection and a zoomed regional path for level nodes, the way Mario Odyssey does. Auto-rotate to the current node. Restored regions spread colour and animals. Save the reveal of the far side of the globe as a big moment.

## 4. Charity model and store rules

**Apple, verbatim** ([Guidelines](https://developer.apple.com/app-store/review/guidelines/))
- **3.2.2(iv)** (unacceptable, unless you are an approved nonprofit): "collecting funds within the app for charities and fundraisers. Apps that seek to raise money for such causes must be free on the App Store and may only collect funds outside of the app, such as via Safari or SMS."
- **3.2.1(vi):** approved nonprofits may fundraise in their own or third-party apps. Requirements: Apple Pay, disclosure of how funds are used, tax receipts, and every listed nonprofit must be approved.
- **2.3 / 2.3.1:** metadata must be accurate; misleading marketing is grounds for removal.
- **3.1.1:** loot-box odds must be disclosed.
- **Apple Pay for nonprofits:** US charities need the Candid Seal; international charities apply via Benevity; Apple takes no fee ([Apple](https://developer.apple.com/apple-pay/nonprofits/)).
- A platform that only authorised off-app donations was still rejected under 3.2.2 ([forum](https://developer.apple.com/forums/thread/130952)).

**Google Play:** Play Billing "must not be used" for tax-exempt donations ([Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)).

**Precedents for "we donate our own revenue"**

| Initiative | Model and results |
|---|---|
| Apps for (RED), 2014 | 25 apps (Angry Birds, Clash of Clans, Monument Valley); proceeds of dedicated purchases went to the Global Fund ([Pocket-lint](https://www.pocket-lint.com/apps/news/apple/131837-angry-birds-clash-of-clans-and-monument-valley-just-a-few-of-the-ios-apps-adding-content-for-world-aids-day/)) |
| EA × WWF, 2015 | One item per game, 35% of net proceeds. Minecraft × WWF: $100k after 10M bamboo blocks placed ([search](https://www.worldwildlife.org/news/sustainability-works/digital-content-with-a-side-of-charity/)) |
| **Terra Nil** | 8% of profits to the Endangered Wildlife Trust, over $100k; 45,528 trees via Tree-Nation ([GWO](https://gameworldobserver.com/2023/04/06/terra-nil-300000-players-free-lives-tree-planting), [GoNintendo](https://www.gonintendo.com/contents/33744-terra-nil-devs-donate-over-100k-to-the-endangered-wildlife-trust-new-update-teased)) |
| **Alba** | One tree per download via Ecologi; 1M trees by December 2021 ([Checkpoint](https://checkpointgaming.net/news/2021/12/1-million-trees-have-been-planted-thanks-to-alba-a-wildlife-adventure/)) |
| Children of Morta: Paws & Claws | 100% of profits to Humane World for Animals; £546k ([Humane World](https://www.humaneworld.org/en/gamers-raise-half-million-animal-rescue)) |
| **Avia "Play for Paws"** | Players feed *real* Nevada SPCA animals with in-game items; the studio pays $0.05 per feeding ([AppSpy](https://www.appspy.com/solitaire-clash/play-for-paws/)) |
| Forest | 2,500 in-game coins buys one real tree (Trees for the Future); over 2M trees ([Wikipedia](https://en.wikipedia.org/wiki/Forest_(application))) |
| Tab for a Cause | At least 30% of revenue; quarterly reports ([Good Good Good](https://www.goodgoodgood.co/articles/tab-for-a-cause)) |
| Humble Bundle | The 2021 plan to cap charity at 15% was reversed after outcry ([Game Developer](https://www.gamedeveloper.com/business/humble-bundle-redesign-axes-sliders-limits-charity-donations-to-15-)). **Never cut a pledge** |
| 1% for the Planet | 1% of *sales* (not profit), certified ([site](https://www.onepercentfortheplanet.org/membership)) |
| Pledge 1% | Commit equity, product, profit or time; 20k+ companies ([site](https://pledge1percent.org/)) |
| Founders Pledge | $13.6B pledged ([site](https://www.founderspledge.com/)) |
| Charity Miles | Sponsors fund donations per mile ([site](https://charitymiles.org/)) |
| Playing for the Planet | 56 members. Green Game Jam 2025: $284k raised; June's Journey made 25% more revenue than projected ([report](https://www.playing4theplanet.org/annual-impact-report-2025)). Green Game Jam 2026: 70 games ([NWN](https://www.natureworldnews.com/articles/73036/20260625/green-game-jam-2026-launched-70-games-63-million-daily-players-behind-coral-reef-rainforest.htm)) |

Not charity models: "Bees Won't Exist" is a student hack-and-slash ([Game Jolt](https://gamejolt.com/games/bees-won-t-exist/194883)). I found no "Alto's Odyssey Wildlife" initiative.

**Possible partners:** Humane World for Animals, Nevada SPCA, Best Friends, WWF, EWT, and the charities Animal Charity Evaluators recommends ([ACE](https://animalcharityevaluators.org/)). Germany-specific options (Deutscher Tierschutzbund, Vier Pfoten) are (unverified) suggestions.

**Legal note:** the German Federal Court of Justice (BGH) allowed cause-related marketing in a 2005 ruling ([de.wikipedia](https://de.wikipedia.org/wiki/Cause-Related_Marketing)), but claims must not mislead. Get legal and tax review.

## 5. Monetization and retention (short)

**Apple Arcade**
- $6.99/month; no ads and no in-app purchases ([Wikipedia](https://en.wikipedia.org/wiki/Apple_Arcade)).
- Developers get upfront funding plus an engagement pool; payouts have fallen since 2020.
- Games that don't grow get removed.

**Ethical free-to-play (Royal Match as the model)**
- No forced ads; generosity first; no early pressure to buy; show near wins ([Emhance](https://www.emhance.ai/blog/how-royal-match-redefined-success-without-breaking-trust)).
- Even so, Royal Match faced a 2024 gambling class action ([Wikipedia](https://en.wikipedia.org/wiki/Royal_Match)).
- Avoid loot boxes and energy walls.

**Benchmarks**
- GameAnalytics 2025, puzzle median: D1 about 20%, D7 about 4.5%, D28 about 1.2%. Top 25% across genres: D1 about 27%, D7 7–8%, D28 about 3% ([GA 2025](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks)).
- GameAnalytics 2026, top 10%: D1 about 40%, D7 11–12% ([GA 2026](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks)).
- Match-3: D7 above 20% is "good"; payer conversion at least 1.69%, top games 3.5–4% ([GA](https://www.gameanalytics.com/blog/match-3-games-metrics-guide)). Candy Crush: 2.3% of players pay.
- Merge Mansion: 69% D1.
- Puzzle sessions last about 5.6 minutes.

**Recommendation:** free to start, then a one-time unlock plus cosmetic and chapter packs. No lives. Boosters are earned by playing. All revenue falls under the pledge.

## 6. Regeneration narratives

- **Terra Nil:** restore the land, then recycle every building and leave no trace ([Wikipedia](https://en.wikipedia.org/wiki/Terra_Nil)).
- **Alba:** catalogue wildlife, clean up, petition against a hotel; the island visibly improves ([Wikipedia](https://en.wikipedia.org/wiki/Alba:_A_Wildlife_Adventure)).
- **Flower:** petals turn dead grass green; the city seen through the apartment window grows brighter; no text ([Wikipedia](https://en.wikipedia.org/wiki/Flower_(video_game))).
- **Spiritfarer:** the boat physically grows; each farewell is an emotional beat ([Wikipedia](https://en.wikipedia.org/wiki/Spiritfarer)).
- **Botanicula:** told entirely without words ([Wikipedia](https://en.wikipedia.org/wiki/Botanicula)).
- **Cloud Gardens:** plants overgrow ruins until a coverage threshold is reached ([Wikipedia](https://en.wikipedia.org/wiki/Cloud_Gardens_(video_game))).
- **Islanders:** points unlock new islands; minimalism ([Wikipedia](https://en.wikipedia.org/wiki/Islanders_(video_game))).
- **Merge Dragons:** healing dead land inside levels.

**Devices to reuse:**
- desaturated to saturated colour;
- animals returning;
- a persistent "window" or globe that changes;
- the protagonist leaving no trace;
- farewell and release moments.

---

## (a) Suggested taxonomy for a 2048 grid (generic names)

The code in brackets is the King characteristic group each item uses: N = Nature, M = Movement, D = Discovery, X = Destruction.

| Group | Element | Behaviour on a sliding grid | [King] |
|---|---|---|---|
| Layout | **Pillar** | Immovable, permanent; acts as an interior wall and creates new merge sites | M-stationary, X-irremovable |
| | **Fence** | Wall between two cells; blocks sliding without taking a cell | edge-type, irremovable |
| | **Void** | Cell that doesn't exist; makes irregular shapes | layout lever |
| | **Mud cell** | A tile entering it stops | dynamic floor |
| | **Current** | Moves a tile 1 cell after each swipe | D-dynamic |
| | **Portal pair** | Tile exits A and enters B | dynamic |
| Cell blockers | **Crate** (1–3 layers) | Loses a layer when a merge ends next to it | N-layered, X-merge-beside |
| | **Boulder 2×2** | 4–8 hits | N-space, layered |
| | **Frozen blob** | Locked in place; neighbouring merges thaw it | M-locked |
| | **Sleeping blob** | Can't merge until an adjacent merge wakes it | D-chained |
| | **Caged creature** | Open with adjacent merges, then guide it to an exit cell (rescue goal) | locked + objective |
| | **Fog cell** | Contents hidden until revealed | D-hiding |
| Floor overlays | **Wilt / deep wilt** | Healed by a merge that lands *on* the cell. "Bloom every cell" is the heal-the-land goal. Centre cells are hard, edge cells easy | X-merge-on |
| | **Buried seed** | Collected when a merge lands on its cell | collect goal |
| Threats (use rarely) | **Blight** | Takes an adjacent empty cell every N moves unless a merge touched it | D-dynamic (chocolate) |
| | **Storm timer** | Counts down, then freezes a blob; not a fail state | countdown |
| | **Wanderer** | Moves 1 cell per swipe; boxing it in "calms" it into a helper (Triple Town bear) | M-movable |
| Spawn | **Nest** | Spawns base blobs next to it; the designer's spawn-rate lever | spawn lever |
| | **Next-spawn preview** | UI, always on | Threes |
| Special pieces | **Wildcard** | Merges with any stage | Triple Town crystal |
| | **Line blob** | Created by 2 merges in one swipe; clears the row/column in the swipe direction | |
| | **Burst blob** | Created by 3+ merges in one swipe; 3×3 blast | |
| | **Stage bomb** | Created when two capped top-stage blobs "graduate"; clears all blobs of one stage | |
| | **Charge ability** | Guide's meter fills with merges (Best Fiends) | |
| | **Combos** | line+line = cross; line+burst = triple cross; burst+burst = 5×5; bomb+X = convert | |
| Boosters | **Rewind, Pluck, Swap, +5 moves, Shuffle** | Rewind is the most important for a casual audience | |

## (b) 100-level pacing skeleton

Ten chapters of 10 levels, each chapter one globe region.
- Each new element gets 2–3 intro levels where it appears alone.
- At most 3–4 element types per level.
- Target attempts: levels 1–20 ≤1.1 (≥90–95% first-try wins); normal ≈1.2–1.4; **H** (hard) ≈1.6–2.0; **SH** (super-hard) ≤2.5. Keep H and SH levels short.
- Never put two hard levels in a row. Every 10th level is a free celebration level.
- Verify every level without boosters using a seeded bot.

| Levels | New element (level) | Objective types | Markers |
|---|---|---|---|
| 1–10 | Swipe/merge and stage chain (1); move limit (2); preview (1); Pillar (6); Rewind booster (8) | Reach stage X; score | 10 celebration |
| 11–20 | Crate (11); collect (14); Wildcard (16); Pluck booster (17); graduation (18) | Clear crates; collect | 19 "tricky", 20 celebration |
| 21–30 | Wilt/heal (21); Line blob (24); Fence (26) | Bloom the board | 28 H, 29 breather |
| 31–40 | Caged creature and rescue (31); Burst (34); Swap booster (35) | Rescue N | 36 H, 39 H |
| 41–50 | Frozen blob (41); voids/shapes (43); Nest (46) | Mixed | 45 H, 49 H |
| 51–60 | Sleeping blob (51); Stage bomb (54); combos (56) | Graduate N | 55 H, 59 SH |
| 61–70 | Blight (61); Mud (64) | Contain the blight | 65 H, 69 SH |
| 71–80 | Boulder (71); feed/order goal (73); Portal (76) | Deliver stage X | 75 H, 79 SH |
| 81–90 | Fog (81); Current (84) | Mixed | 85 H, 89 SH |
| 91–100 | Wanderer (91); finale remix | Calm the wanderer | 95 H, 99 SH (short), 100 finale |

## (c) App-Store-safe charity implementation

1. **Pledge wording:** "We give one third of our *net revenue* (after store fees, taxes and refunds) from [Game] to animal-welfare organizations." Revenue is easier to verify than profit. Model the cost carefully: after store fees this is a very large share, and after Humble Bundle you must never cut it.
2. **In-app purchases are normal digital goods.** No purchase is labelled or sold as a donation, and there is no in-app "donate" button. Add this line: "Purchases are not donations and are not tax-deductible." That keeps you outside 3.2.2(iv).
3. **Keep the store listing and in-game claims accurate (2.3).** Attach the partner agreements in the App Review notes.
4. **Transparency:** publish quarterly impact reports and donation receipts, as Tab for a Cause does.
5. **Make it part of play without charging for it:**
   - "Care points" earned by playing let players vote how each quarter's donation pool is split between partners. The studio pays; players direct.
   - Studio-wide donation milestones unlock free cosmetics for everyone.
   - A "Field Journal" tells real animal stories, with the charity's consent (Avia did this with real shelter animals).
   - A globe overlay shows where funded projects are.
6. **Later, optional:**
   - A link to donate directly on the partner's website (Safari). This is only allowed if the app is free to download.
   - Apple Pay donations under 3.2.1(vi), only with approved nonprofits, plus disclosures and tax receipts.
   - On Google Play, never route donations through Play Billing.
7. **Community:** join Playing for the Planet and the Green Game Jam.
