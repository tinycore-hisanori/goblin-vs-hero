# Progression and play rewards — proposal

Updated: the core per-round evolution and browser-local career/cosmetic persistence are now implemented. Twitch identity and cloud persistence remain unimplemented. The sections below retain design intent.

## Per-round strength

- Start each expedition as a normal viewer goblin.
- Training, same-team hunting and other risky/helpful actions can earn evolution XP within the round.
- Evolution is voluntary; increasing size should trade away stealth and some shortcuts.
- Do not carry raw combat stats, level, consumable stock or a starting advanced evolution into the next round.

## Persistent recognition

- Career XP is a separate record of participation and accomplishments; it has no damage or maximum-HP multiplier.
- Milestones can unlock scarf patterns, name decorations, titles, celebration poses and a profile collection of previously reached evolutions.
- Credit useful actions (digging, teamwork, training, distractions) rather than only last hits.
- Reward active participation and cap repetitive farming credit. Avoid turning practice-room idling or repeatedly killing the same friend into the best career-reward source.
- A repeat player should have more ways to express themselves, while a newcomer remains able to compete in the same match.

## Training room

The room and equipment are implemented near the entrance/pantry wing: a wooden dummy, weights, hanging punching bag, rest bench and training mat. The north corridor joins the pantry and the east corridor joins the entrance. All three approach positions are reachable and equipment blocks movement.

Training-to-XP, local viewer commands, model/stat evolution and browser-local career rewards are implemented. Networking and Twitch authorization remain pending. Suggested training flow: travel to an available station, spend time visibly training, earn a small amount of round XP, then choose between continuing training and helping the team. Any permanent training credit needs active-play checks and a per-round cap. Rates should be chosen after same-round evolution has been playtested.
