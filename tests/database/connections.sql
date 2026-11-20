-- Connection fixtures and automatic-action race checks; all data rolls back.
begin;

insert into
  auth.users (
    id,
    aud,
    role,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
values
  (
    '91000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    '{}',
    '{}',
    now(),
    now()
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    '{}',
    '{}',
    now(),
    now()
  ),
  (
    '91000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    '{}',
    '{}',
    now(),
    now()
  );

create temp table qa_connection_room as
select
  (
    public.galactic_create_room (
      '91000000-0000-4000-8000-000000000001',
      'QACN22',
      'Rollback connection QA',
      true,
      '{"name":"QA Host","character":"luke","faction":"Rebel Alliance"}'
    ) -> 'room' ->> 'id'
  )::uuid as id;

select
  public.galactic_join_room (
    '91000000-0000-4000-8000-000000000002',
    'QACN22',
    '{"name":"QA Guest","character":"vader","faction":"Galactic Empire"}'
  );

select
  public.galactic_ready (
    (
      select
        id
      from
        qa_connection_room
    ),
    '91000000-0000-4000-8000-000000000001',
    'luke'
  );

select
  public.galactic_ready (
    (
      select
        id
      from
        qa_connection_room
    ),
    '91000000-0000-4000-8000-000000000002',
    'vader'
  );

select
  public.galactic_start_match (
    (
      select
        id
      from
        qa_connection_room
    ),
    '91000000-0000-4000-8000-000000000001',
    $json$
{
  "id": "91000000-0000-4000-8000-000000000004",
  "version": 0,
  "players": [
    {
      "id": "91000000-0000-4000-8000-000000000001",
      "name": "QA Host",
      "character": "luke",
      "faction": "Rebel Alliance",
      "color": "#79b0dc",
      "ai": false,
      "credits": 1500,
      "position": 0,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    },
    {
      "id": "91000000-0000-4000-8000-000000000002",
      "name": "QA Guest",
      "character": "vader",
      "faction": "Galactic Empire",
      "color": "#dd7777",
      "ai": false,
      "credits": 1500,
      "position": 0,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    }
  ],
  "rules": {
    "startingCredits": 1500,
    "startBonus": 200,
    "auctions": true,
    "freeParking": false,
    "incomeTax": 200,
    "luxuryTax": 100,
    "outposts": 32,
    "bases": 12,
    "trading": true,
    "mortgageInterest": 0.1,
    "roundLimit": 0,
    "mortgages": true,
    "difficulty": "medium",
    "teams": false,
    "sharedProperties": false,
    "noTeamRent": true,
    "duplicateCharacters": false,
    "id": "91000000-0000-4000-8000-000000000004",
    "now": 1795153015126
  },
  "turn": 0,
  "round": 1,
  "turnDeadline": null,
  "phase": "roll",
  "dice": [
    1,
    1
  ],
  "doubles": 0,
  "extraTurn": false,
  "ownership": {},
  "pendingProperty": null,
  "auction": null,
  "trades": [],
  "tradeHistory": [],
  "debt": null,
  "payments": [],
  "pot": 0,
  "inventory": {
    "outposts": 32,
    "bases": 12
  },
  "decks": {
    "force": [
      "f10",
      "f7",
      "f1",
      "f5",
      "f6",
      "f2",
      "f8",
      "f9",
      "f3",
      "f11",
      "f12",
      "f4"
    ],
    "galactic": [
      "g10",
      "g7",
      "g1",
      "g5",
      "g6",
      "g2",
      "g8",
      "g9",
      "g3",
      "g11",
      "g12",
      "g4"
    ]
  },
  "discards": {
    "force": [],
    "galactic": []
  },
  "events": [
    {
      "id": "event-1",
      "text": "The galaxy is yours to conquer. All commanders receive starting credits.",
      "type": "start",
      "turn": 1
    }
  ],
  "history": [],
  "processed": [],
  "movement": null,
  "lastCard": null,
  "winner": null,
  "eventSequence": 1
}
$json$::jsonb,
    $json$
{
  "id": "91000000-0000-4000-8000-000000000004",
  "version": 0,
  "players": [
    {
      "id": "91000000-0000-4000-8000-000000000001",
      "name": "QA Host",
      "character": "luke",
      "faction": "Rebel Alliance",
      "color": "#79b0dc",
      "ai": false,
      "credits": 1500,
      "position": 0,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    },
    {
      "id": "91000000-0000-4000-8000-000000000002",
      "name": "QA Guest",
      "character": "vader",
      "faction": "Galactic Empire",
      "color": "#dd7777",
      "ai": false,
      "credits": 1500,
      "position": 0,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    }
  ],
  "rules": {
    "startingCredits": 1500,
    "startBonus": 200,
    "auctions": true,
    "freeParking": false,
    "incomeTax": 200,
    "luxuryTax": 100,
    "outposts": 32,
    "bases": 12,
    "trading": true,
    "mortgageInterest": 0.1,
    "roundLimit": 0,
    "mortgages": true,
    "difficulty": "medium",
    "teams": false,
    "sharedProperties": false,
    "noTeamRent": true,
    "duplicateCharacters": false,
    "id": "91000000-0000-4000-8000-000000000004",
    "now": 1795153015126
  },
  "turn": 0,
  "round": 1,
  "turnDeadline": null,
  "phase": "roll",
  "dice": [
    1,
    1
  ],
  "doubles": 0,
  "extraTurn": false,
  "ownership": {},
  "pendingProperty": null,
  "auction": null,
  "trades": [],
  "tradeHistory": [],
  "debt": null,
  "pot": 0,
  "inventory": {
    "outposts": 32,
    "bases": 12
  },
  "events": [
    {
      "id": "event-1",
      "text": "The galaxy is yours to conquer. All commanders receive starting credits.",
      "type": "start",
      "turn": 1
    }
  ],
  "history": [],
  "movement": null,
  "lastCard": null,
  "winner": null,
  "eventSequence": 1,
  "deckCounts": {
    "force": 12,
    "galactic": 12
  }
}
$json$::jsonb
  );

do $$
declare c jsonb;

result jsonb;

begin perform public.galactic_connection (
  '91000000-0000-4000-8000-000000000004',
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000011',
  'online'
);

perform public.galactic_connection (
  '91000000-0000-4000-8000-000000000004',
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000012',
  'online'
);

c := public.galactic_connection (
  '91000000-0000-4000-8000-000000000004',
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000011',
  'left'
) -> '91000000-0000-4000-8000-000000000001';

if c ->> 'status' <> 'online'
or c -> 'deadline' <> 'null'::jsonb then raise exception 'QA FAIL one closing tab interrupted another active tab';

end if;

c := public.galactic_connection (
  '91000000-0000-4000-8000-000000000004',
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000012',
  'left'
) -> '91000000-0000-4000-8000-000000000001';

if c ->> 'status' <> 'left'
or (c ->> 'deadline')::numeric - (c ->> 'lastSeen')::numeric <> 120000 then raise exception 'QA FAIL leave grace is not two minutes';

end if;

update galactic_private.connection_leases
set
  status = 'online',
  last_seen = now() - interval '31 seconds'
where
  game_id = '91000000-0000-4000-8000-000000000004'
  and player_id = '91000000-0000-4000-8000-000000000001';

c := public.galactic_connections ('91000000-0000-4000-8000-000000000004') -> '91000000-0000-4000-8000-000000000001';

if c ->> 'status' <> 'disconnected'
or (c ->> 'deadline')::numeric - (c ->> 'lastSeen')::numeric <> 330000 then raise exception 'QA FAIL disconnect grace is not five minutes after detection';

end if;

result := public.galactic_commit (
  '91000000-0000-4000-8000-000000000004',
  $json$
{
  "id": "91000000-0000-4000-8000-000000000005",
  "player": "91000000-0000-4000-8000-000000000001",
  "type": "ROLL",
  "payload": {},
  "version": 0,
  "now": 1795153015128,
  "connectionTimeout": true
}
$json$::jsonb,
  0,
  $json$
{
  "id": "91000000-0000-4000-8000-000000000004",
  "version": 1,
  "players": [
    {
      "id": "91000000-0000-4000-8000-000000000001",
      "name": "QA Host",
      "character": "luke",
      "faction": "Rebel Alliance",
      "color": "#79b0dc",
      "ai": false,
      "credits": 1300,
      "position": 4,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    },
    {
      "id": "91000000-0000-4000-8000-000000000002",
      "name": "QA Guest",
      "character": "vader",
      "faction": "Galactic Empire",
      "color": "#dd7777",
      "ai": false,
      "credits": 1500,
      "position": 0,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    }
  ],
  "rules": {
    "startingCredits": 1500,
    "startBonus": 200,
    "auctions": true,
    "freeParking": false,
    "incomeTax": 200,
    "luxuryTax": 100,
    "outposts": 32,
    "bases": 12,
    "trading": true,
    "mortgageInterest": 0.1,
    "roundLimit": 0,
    "mortgages": true,
    "difficulty": "medium",
    "teams": false,
    "sharedProperties": false,
    "noTeamRent": true,
    "duplicateCharacters": false,
    "id": "91000000-0000-4000-8000-000000000004",
    "now": 1795153015126
  },
  "turn": 0,
  "round": 1,
  "turnDeadline": null,
  "phase": "end",
  "dice": [
    2,
    2
  ],
  "doubles": 1,
  "extraTurn": true,
  "ownership": {},
  "pendingProperty": null,
  "auction": null,
  "trades": [],
  "tradeHistory": [],
  "debt": null,
  "payments": [],
  "pot": 0,
  "inventory": {
    "outposts": 32,
    "bases": 12
  },
  "decks": {
    "force": [
      "f10",
      "f7",
      "f1",
      "f5",
      "f6",
      "f2",
      "f8",
      "f9",
      "f3",
      "f11",
      "f12",
      "f4"
    ],
    "galactic": [
      "g10",
      "g7",
      "g1",
      "g5",
      "g6",
      "g2",
      "g8",
      "g9",
      "g3",
      "g11",
      "g12",
      "g4"
    ]
  },
  "discards": {
    "force": [],
    "galactic": []
  },
  "events": [
    {
      "id": "event-1",
      "text": "The galaxy is yours to conquer. All commanders receive starting credits.",
      "type": "start",
      "turn": 1
    },
    {
      "id": "event-2",
      "text": "QA Host arrived at Imperial Tax.",
      "type": "move",
      "turn": 1
    },
    {
      "id": "event-3",
      "text": "QA Host paid 200 credits.",
      "type": "money",
      "turn": 1
    }
  ],
  "history": [],
  "processed": [
    "91000000-0000-4000-8000-000000000005"
  ],
  "movement": {
    "player": "91000000-0000-4000-8000-000000000001",
    "from": 0,
    "steps": 4,
    "back": false,
    "path": [
      1,
      2,
      3,
      4
    ]
  },
  "lastCard": null,
  "winner": null,
  "eventSequence": 3,
  "animationUntil": 1795153017368,
  "lastActionType": "ROLL"
}
$json$::jsonb,
  $json$
{
  "id": "91000000-0000-4000-8000-000000000004",
  "version": 1,
  "players": [
    {
      "id": "91000000-0000-4000-8000-000000000001",
      "name": "QA Host",
      "character": "luke",
      "faction": "Rebel Alliance",
      "color": "#79b0dc",
      "ai": false,
      "credits": 1300,
      "position": 4,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    },
    {
      "id": "91000000-0000-4000-8000-000000000002",
      "name": "QA Guest",
      "character": "vader",
      "faction": "Galactic Empire",
      "color": "#dd7777",
      "ai": false,
      "credits": 1500,
      "position": 0,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    }
  ],
  "rules": {
    "startingCredits": 1500,
    "startBonus": 200,
    "auctions": true,
    "freeParking": false,
    "incomeTax": 200,
    "luxuryTax": 100,
    "outposts": 32,
    "bases": 12,
    "trading": true,
    "mortgageInterest": 0.1,
    "roundLimit": 0,
    "mortgages": true,
    "difficulty": "medium",
    "teams": false,
    "sharedProperties": false,
    "noTeamRent": true,
    "duplicateCharacters": false,
    "id": "91000000-0000-4000-8000-000000000004",
    "now": 1795153015126
  },
  "turn": 0,
  "round": 1,
  "turnDeadline": null,
  "phase": "end",
  "dice": [
    2,
    2
  ],
  "doubles": 1,
  "extraTurn": true,
  "ownership": {},
  "pendingProperty": null,
  "auction": null,
  "trades": [],
  "tradeHistory": [],
  "debt": null,
  "pot": 0,
  "inventory": {
    "outposts": 32,
    "bases": 12
  },
  "events": [
    {
      "id": "event-1",
      "text": "The galaxy is yours to conquer. All commanders receive starting credits.",
      "type": "start",
      "turn": 1
    },
    {
      "id": "event-2",
      "text": "QA Host arrived at Imperial Tax.",
      "type": "move",
      "turn": 1
    },
    {
      "id": "event-3",
      "text": "QA Host paid 200 credits.",
      "type": "money",
      "turn": 1
    }
  ],
  "history": [],
  "movement": {
    "player": "91000000-0000-4000-8000-000000000001",
    "from": 0,
    "steps": 4,
    "back": false,
    "path": [
      1,
      2,
      3,
      4
    ]
  },
  "lastCard": null,
  "winner": null,
  "eventSequence": 3,
  "animationUntil": 1795153017368,
  "lastActionType": "ROLL",
  "deckCounts": {
    "force": 12,
    "galactic": 12
  }
}
$json$::jsonb
);

if result ->> 'version' <> '0' then raise exception 'QA FAIL automatic action ran before grace expired';

end if;

update galactic_private.connection_leases
set
  last_seen = now() - interval '6 minutes'
where
  game_id = '91000000-0000-4000-8000-000000000004'
  and player_id = '91000000-0000-4000-8000-000000000001';

perform public.galactic_connection (
  '91000000-0000-4000-8000-000000000004',
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000011',
  'online'
);

result := public.galactic_commit (
  '91000000-0000-4000-8000-000000000004',
  $json$
{
  "id": "91000000-0000-4000-8000-000000000005",
  "player": "91000000-0000-4000-8000-000000000001",
  "type": "ROLL",
  "payload": {},
  "version": 0,
  "now": 1795153015128,
  "connectionTimeout": true
}
$json$::jsonb,
  0,
  $json$
{
  "id": "91000000-0000-4000-8000-000000000004",
  "version": 1,
  "players": [
    {
      "id": "91000000-0000-4000-8000-000000000001",
      "name": "QA Host",
      "character": "luke",
      "faction": "Rebel Alliance",
      "color": "#79b0dc",
      "ai": false,
      "credits": 1300,
      "position": 4,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    },
    {
      "id": "91000000-0000-4000-8000-000000000002",
      "name": "QA Guest",
      "character": "vader",
      "faction": "Galactic Empire",
      "color": "#dd7777",
      "ai": false,
      "credits": 1500,
      "position": 0,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    }
  ],
  "rules": {
    "startingCredits": 1500,
    "startBonus": 200,
    "auctions": true,
    "freeParking": false,
    "incomeTax": 200,
    "luxuryTax": 100,
    "outposts": 32,
    "bases": 12,
    "trading": true,
    "mortgageInterest": 0.1,
    "roundLimit": 0,
    "mortgages": true,
    "difficulty": "medium",
    "teams": false,
    "sharedProperties": false,
    "noTeamRent": true,
    "duplicateCharacters": false,
    "id": "91000000-0000-4000-8000-000000000004",
    "now": 1795153015126
  },
  "turn": 0,
  "round": 1,
  "turnDeadline": null,
  "phase": "end",
  "dice": [
    2,
    2
  ],
  "doubles": 1,
  "extraTurn": true,
  "ownership": {},
  "pendingProperty": null,
  "auction": null,
  "trades": [],
  "tradeHistory": [],
  "debt": null,
  "payments": [],
  "pot": 0,
  "inventory": {
    "outposts": 32,
    "bases": 12
  },
  "decks": {
    "force": [
      "f10",
      "f7",
      "f1",
      "f5",
      "f6",
      "f2",
      "f8",
      "f9",
      "f3",
      "f11",
      "f12",
      "f4"
    ],
    "galactic": [
      "g10",
      "g7",
      "g1",
      "g5",
      "g6",
      "g2",
      "g8",
      "g9",
      "g3",
      "g11",
      "g12",
      "g4"
    ]
  },
  "discards": {
    "force": [],
    "galactic": []
  },
  "events": [
    {
      "id": "event-1",
      "text": "The galaxy is yours to conquer. All commanders receive starting credits.",
      "type": "start",
      "turn": 1
    },
    {
      "id": "event-2",
      "text": "QA Host arrived at Imperial Tax.",
      "type": "move",
      "turn": 1
    },
    {
      "id": "event-3",
      "text": "QA Host paid 200 credits.",
      "type": "money",
      "turn": 1
    }
  ],
  "history": [],
  "processed": [
    "91000000-0000-4000-8000-000000000005"
  ],
  "movement": {
    "player": "91000000-0000-4000-8000-000000000001",
    "from": 0,
    "steps": 4,
    "back": false,
    "path": [
      1,
      2,
      3,
      4
    ]
  },
  "lastCard": null,
  "winner": null,
  "eventSequence": 3,
  "animationUntil": 1795153017368,
  "lastActionType": "ROLL"
}
$json$::jsonb,
  $json$
{
  "id": "91000000-0000-4000-8000-000000000004",
  "version": 1,
  "players": [
    {
      "id": "91000000-0000-4000-8000-000000000001",
      "name": "QA Host",
      "character": "luke",
      "faction": "Rebel Alliance",
      "color": "#79b0dc",
      "ai": false,
      "credits": 1300,
      "position": 4,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    },
    {
      "id": "91000000-0000-4000-8000-000000000002",
      "name": "QA Guest",
      "character": "vader",
      "faction": "Galactic Empire",
      "color": "#dd7777",
      "ai": false,
      "credits": 1500,
      "position": 0,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    }
  ],
  "rules": {
    "startingCredits": 1500,
    "startBonus": 200,
    "auctions": true,
    "freeParking": false,
    "incomeTax": 200,
    "luxuryTax": 100,
    "outposts": 32,
    "bases": 12,
    "trading": true,
    "mortgageInterest": 0.1,
    "roundLimit": 0,
    "mortgages": true,
    "difficulty": "medium",
    "teams": false,
    "sharedProperties": false,
    "noTeamRent": true,
    "duplicateCharacters": false,
    "id": "91000000-0000-4000-8000-000000000004",
    "now": 1795153015126
  },
  "turn": 0,
  "round": 1,
  "turnDeadline": null,
  "phase": "end",
  "dice": [
    2,
    2
  ],
  "doubles": 1,
  "extraTurn": true,
  "ownership": {},
  "pendingProperty": null,
  "auction": null,
  "trades": [],
  "tradeHistory": [],
  "debt": null,
  "pot": 0,
  "inventory": {
    "outposts": 32,
    "bases": 12
  },
  "events": [
    {
      "id": "event-1",
      "text": "The galaxy is yours to conquer. All commanders receive starting credits.",
      "type": "start",
      "turn": 1
    },
    {
      "id": "event-2",
      "text": "QA Host arrived at Imperial Tax.",
      "type": "move",
      "turn": 1
    },
    {
      "id": "event-3",
      "text": "QA Host paid 200 credits.",
      "type": "money",
      "turn": 1
    }
  ],
  "history": [],
  "movement": {
    "player": "91000000-0000-4000-8000-000000000001",
    "from": 0,
    "steps": 4,
    "back": false,
    "path": [
      1,
      2,
      3,
      4
    ]
  },
  "lastCard": null,
  "winner": null,
  "eventSequence": 3,
  "animationUntil": 1795153017368,
  "lastActionType": "ROLL",
  "deckCounts": {
    "force": 12,
    "galactic": 12
  }
}
$json$::jsonb
);

if result ->> 'version' <> '0' then raise exception 'QA FAIL stale automatic action overrode a reconnect';

end if;

update galactic_private.connection_leases
set
  last_seen = now() - interval '6 minutes'
where
  game_id = '91000000-0000-4000-8000-000000000004'
  and player_id = '91000000-0000-4000-8000-000000000001';

result := public.galactic_commit (
  '91000000-0000-4000-8000-000000000004',
  $json$
{
  "id": "91000000-0000-4000-8000-000000000005",
  "player": "91000000-0000-4000-8000-000000000001",
  "type": "ROLL",
  "payload": {},
  "version": 0,
  "now": 1795153015128,
  "connectionTimeout": true
}
$json$::jsonb,
  0,
  $json$
{
  "id": "91000000-0000-4000-8000-000000000004",
  "version": 1,
  "players": [
    {
      "id": "91000000-0000-4000-8000-000000000001",
      "name": "QA Host",
      "character": "luke",
      "faction": "Rebel Alliance",
      "color": "#79b0dc",
      "ai": false,
      "credits": 1300,
      "position": 4,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    },
    {
      "id": "91000000-0000-4000-8000-000000000002",
      "name": "QA Guest",
      "character": "vader",
      "faction": "Galactic Empire",
      "color": "#dd7777",
      "ai": false,
      "credits": 1500,
      "position": 0,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    }
  ],
  "rules": {
    "startingCredits": 1500,
    "startBonus": 200,
    "auctions": true,
    "freeParking": false,
    "incomeTax": 200,
    "luxuryTax": 100,
    "outposts": 32,
    "bases": 12,
    "trading": true,
    "mortgageInterest": 0.1,
    "roundLimit": 0,
    "mortgages": true,
    "difficulty": "medium",
    "teams": false,
    "sharedProperties": false,
    "noTeamRent": true,
    "duplicateCharacters": false,
    "id": "91000000-0000-4000-8000-000000000004",
    "now": 1795153015126
  },
  "turn": 0,
  "round": 1,
  "turnDeadline": null,
  "phase": "end",
  "dice": [
    2,
    2
  ],
  "doubles": 1,
  "extraTurn": true,
  "ownership": {},
  "pendingProperty": null,
  "auction": null,
  "trades": [],
  "tradeHistory": [],
  "debt": null,
  "payments": [],
  "pot": 0,
  "inventory": {
    "outposts": 32,
    "bases": 12
  },
  "decks": {
    "force": [
      "f10",
      "f7",
      "f1",
      "f5",
      "f6",
      "f2",
      "f8",
      "f9",
      "f3",
      "f11",
      "f12",
      "f4"
    ],
    "galactic": [
      "g10",
      "g7",
      "g1",
      "g5",
      "g6",
      "g2",
      "g8",
      "g9",
      "g3",
      "g11",
      "g12",
      "g4"
    ]
  },
  "discards": {
    "force": [],
    "galactic": []
  },
  "events": [
    {
      "id": "event-1",
      "text": "The galaxy is yours to conquer. All commanders receive starting credits.",
      "type": "start",
      "turn": 1
    },
    {
      "id": "event-2",
      "text": "QA Host arrived at Imperial Tax.",
      "type": "move",
      "turn": 1
    },
    {
      "id": "event-3",
      "text": "QA Host paid 200 credits.",
      "type": "money",
      "turn": 1
    }
  ],
  "history": [],
  "processed": [
    "91000000-0000-4000-8000-000000000005"
  ],
  "movement": {
    "player": "91000000-0000-4000-8000-000000000001",
    "from": 0,
    "steps": 4,
    "back": false,
    "path": [
      1,
      2,
      3,
      4
    ]
  },
  "lastCard": null,
  "winner": null,
  "eventSequence": 3,
  "animationUntil": 1795153017368,
  "lastActionType": "ROLL"
}
$json$::jsonb,
  $json$
{
  "id": "91000000-0000-4000-8000-000000000004",
  "version": 1,
  "players": [
    {
      "id": "91000000-0000-4000-8000-000000000001",
      "name": "QA Host",
      "character": "luke",
      "faction": "Rebel Alliance",
      "color": "#79b0dc",
      "ai": false,
      "credits": 1300,
      "position": 4,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    },
    {
      "id": "91000000-0000-4000-8000-000000000002",
      "name": "QA Guest",
      "character": "vader",
      "faction": "Galactic Empire",
      "color": "#dd7777",
      "ai": false,
      "credits": 1500,
      "position": 0,
      "cards": [],
      "detained": false,
      "jailAttempts": 0,
      "bankrupt": false
    }
  ],
  "rules": {
    "startingCredits": 1500,
    "startBonus": 200,
    "auctions": true,
    "freeParking": false,
    "incomeTax": 200,
    "luxuryTax": 100,
    "outposts": 32,
    "bases": 12,
    "trading": true,
    "mortgageInterest": 0.1,
    "roundLimit": 0,
    "mortgages": true,
    "difficulty": "medium",
    "teams": false,
    "sharedProperties": false,
    "noTeamRent": true,
    "duplicateCharacters": false,
    "id": "91000000-0000-4000-8000-000000000004",
    "now": 1795153015126
  },
  "turn": 0,
  "round": 1,
  "turnDeadline": null,
  "phase": "end",
  "dice": [
    2,
    2
  ],
  "doubles": 1,
  "extraTurn": true,
  "ownership": {},
  "pendingProperty": null,
  "auction": null,
  "trades": [],
  "tradeHistory": [],
  "debt": null,
  "pot": 0,
  "inventory": {
    "outposts": 32,
    "bases": 12
  },
  "events": [
    {
      "id": "event-1",
      "text": "The galaxy is yours to conquer. All commanders receive starting credits.",
      "type": "start",
      "turn": 1
    },
    {
      "id": "event-2",
      "text": "QA Host arrived at Imperial Tax.",
      "type": "move",
      "turn": 1
    },
    {
      "id": "event-3",
      "text": "QA Host paid 200 credits.",
      "type": "money",
      "turn": 1
    }
  ],
  "history": [],
  "movement": {
    "player": "91000000-0000-4000-8000-000000000001",
    "from": 0,
    "steps": 4,
    "back": false,
    "path": [
      1,
      2,
      3,
      4
    ]
  },
  "lastCard": null,
  "winner": null,
  "eventSequence": 3,
  "animationUntil": 1795153017368,
  "lastActionType": "ROLL",
  "deckCounts": {
    "force": 12,
    "galactic": 12
  }
}
$json$::jsonb
);

if result ->> 'version' <> '1' then raise exception 'QA FAIL expired grace failed to allow temporary control';

end if;

if (
  select
    count(*)
  from
    galactic_private.actions
  where
    game_id = '91000000-0000-4000-8000-000000000004'
) <> 1 then raise exception 'QA FAIL denied automatic actions wrote game history';

end if;

begin perform public.galactic_connection (
  '91000000-0000-4000-8000-000000000004',
  '91000000-0000-4000-8000-000000000003',
  '91000000-0000-4000-8000-000000000011',
  'online'
);

raise exception 'QA FAIL outsider heartbeat accepted';

exception when others then if SQLERRM like 'QA FAIL%' then raise;

end if;

if SQLERRM not like '%membership%' then raise;

end if;

end;

end
$$;

set
  local role authenticated;

do $$
begin if has_schema_privilege('authenticated', 'galactic_private', 'USAGE') then raise exception 'QA FAIL private lease access';

end if;

if has_function_privilege(
  'authenticated',
  'public.galactic_connection(uuid,uuid,uuid,text)',
  'EXECUTE'
)
or has_function_privilege(
  'authenticated',
  'public.galactic_connections(uuid)',
  'EXECUTE'
)
or has_function_privilege(
  'authenticated',
  'public.galactic_commit_core(uuid,jsonb,integer,jsonb,jsonb)',
  'EXECUTE'
) then raise exception 'QA FAIL connection authority RPC exposed';

end if;

end
$$;

reset role;

select
  'PASS: live tabs, two-minute leave, five-minute disconnect, reconnect commit guard, expiry and private authorization; fixtures rolled back' as verification;

rollback;
