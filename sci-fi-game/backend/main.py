

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Game State Models ---

class GameState(BaseModel):
    current_node_id: str
    current_narrative: str
    choices: List[str]
    game_over: bool = False
    energy: int = 100
    data_units: int = 0
    # We will use a dictionary to store the player's answers
    customer_avatar: Dict[str, Any] = {}

class PlayerChoice(BaseModel):
    choice: str
    current_state: GameState

# --- Narrative Tree Definition ---

narrative_tree = {
    "start": {
        "narrative": "You wake up on a spaceship. Lights are red. What do you do?",
        "choices": ["Check controls", "Look around"],
        "destinations": {
            "Check controls": "controls_check",
            "Look around": "look_around"
        }
    },
    "controls_check": {
        "narrative": "Controls are dark. A message blinks: 'Power Low'.",
        "choices": ["Find power source", "Call for help"],
        "destinations": {
            "Find power source": "power_source",
            "Call for help": "call_help"
        }
    },
    "look_around": {
        "narrative": "The ship is empty. A strange device hums in the corner.",
        "choices": ["Examine device", "Search for crew"],
        "destinations": {
            "Examine device": "examine_device",
            "Search for crew": "search_crew"
        }
    },
    "power_source": {
        "narrative": "You find a glowing crystal. It pulses with energy.",
        "choices": ["Touch crystal", "Leave it"],
        "destinations": {
            "Touch crystal": "crystal_touch",
            "Leave it": "game_over_no_power"
        }
    },
    "call_help": {
        "narrative": "No response. The comms are dead.",
        "choices": ["Try again", "Give up"],
        "destinations": {
            "Try again": "game_over_no_help",
            "Give up": "game_over_no_help"
        }
    },
    "examine_device": {
        "narrative": "The device shows a map. A green dot blinks nearby.",
        "choices": ["Go to green dot", "Stay here"],
        "destinations": {
            "Go to green dot": "green_dot",
            "Stay here": "game_over_stay"
        }
    },
    "search_crew": {
        "narrative": "No one. Just empty cabins.",
        "choices": ["Go to bridge", "Go to cargo bay"],
        "destinations": {
            "Go to bridge": "bridge",
            "Go to cargo bay": "cargo_bay"
        }
    },
    "crystal_touch": {
        "narrative": "Energy flows into you. The ship lights up!",
        "choices": ["Check controls", "Go to bridge"],
        "destinations": {
            "Check controls": "controls_check_powered",
            "Go to bridge": "bridge_powered"
        }
    },
    "game_over_no_power": {
        "narrative": "Without power, the ship drifts. Game Over.",
        "choices": [],
        "game_over": True
    },
    "game_over_no_help": {
        "narrative": "Alone in space. Game Over.",
        "choices": [],
        "game_over": True
    },
    "game_over_stay": {
        "narrative": "You wait. Nothing happens. Game Over.",
        "choices": [],
        "game_over": True
    },
    "green_dot": {
        "narrative": "You find a small escape pod. It's ready to launch.",
        "choices": ["Launch pod", "Wait for rescue"],
        "destinations": {
            "Launch pod": "win_escape",
            "Wait for rescue": "game_over_wait"
        }
    },
    "bridge": {
        "narrative": "The bridge is dark. You see a faint light on the main console.",
        "choices": ["Investigate light", "Return to cabins"],
        "destinations": {
            "Investigate light": "investigate_light",
            "Return to cabins": "search_crew" # Loop back
        }
    },
    "cargo_bay": {
        "narrative": "The cargo bay is full of strange crates. One is open.",
        "choices": ["Look inside crate", "Ignore crates"],
        "destinations": {
            "Look inside crate": "look_crate",
            "Ignore crates": "bridge" # Go to bridge
        }
    },
    "controls_check_powered": {
        "narrative": "Controls are now active. You can plot a course.",
        "choices": ["Plot course to Earth", "Plot course to unknown planet"],
        "destinations": {
            "Plot course to Earth": "win_earth",
            "Plot course to unknown planet": "win_unknown"
        }
    },
    "bridge_powered": {
        "narrative": "The bridge is lit. You see a distress signal on the main screen.",
        "choices": ["Answer signal", "Ignore signal"],
        "destinations": {
            "Answer signal": "answer_signal",
            "Ignore signal": "win_ignore"
        }
    },
    "investigate_light": {
        "narrative": "It's a message from a lost crew member. They are on a nearby planet.",
        "choices": ["Go to planet", "Report to command"],
        "destinations": {
            "Go to planet": "win_rescue",
            "Report to command": "game_over_report"
        }
    },
    "look_crate": {
        "narrative": "Inside is a map to a hidden treasure. But it's guarded.",
        "choices": ["Seek treasure", "Leave it"],
        "destinations": {
            "Seek treasure": "game_over_treasure",
            "Leave it": "bridge"
        }
    },
    "win_escape": {
        "narrative": "You escape the ship. You are safe. Victory!",
        "choices": [],
        "game_over": True
    },
    "game_over_wait": {
        "narrative": "Rescue never comes. Game Over.",
        "choices": [],
        "game_over": True
    },
    "win_earth": {
        "narrative": "You arrive on Earth. Mission accomplished. Victory!",
        "choices": [],
        "game_over": True
    },
    "win_unknown": {
        "narrative": "You explore a new world. The adventure continues. Victory!",
        "choices": [],
        "game_over": True
    },
    "answer_signal": {
        "narrative": "You connect with a friendly alien ship. They offer help. Victory!",
        "choices": [],
        "game_over": True
    },
    "win_ignore": {
        "narrative": "You ignore the signal and continue your journey. Victory!",
        "choices": [],
        "game_over": True
    },
    "win_rescue": {
        "narrative": "You rescue the crew member. Hero! Victory!",
        "choices": [],
        "game_over": True
    },
    "game_over_report": {
        "narrative": "Command is too far. You run out of time. Game Over.",
        "choices": [],
        "game_over": True
    },
    "game_over_treasure": {
        "narrative": "The treasure was too well guarded. Game Over.",
        "choices": [],
        "game_over": True
    }
}

# --- API Endpoints ---

@app.post("/start_game", response_model=GameState)
async def start_game():
    start_node = narrative_tree["start"]
    return GameState(
        current_node_id="start",
        current_narrative=start_node["narrative"],
        choices=start_node["choices"]
    )

@app.post("/make_choice", response_model=GameState)
async def make_choice(player_choice: PlayerChoice):
    current_state = player_choice.current_state
    choice = player_choice.choice
    
    # Get the current node from the narrative tree
    current_node = narrative_tree[current_state.current_node_id]
    
    # Store the player's answer
    if "key" in current_node:
        current_state.customer_avatar[current_node["key"]] = choice
    
    # Determine the next node based on the choice
    next_node_id = current_node["destinations"].get(choice)

    if not next_node_id or next_node_id not in narrative_tree:
        next_node_id = "end_game" # Default to end game if no specific path
        
    next_node = narrative_tree[next_node_id]

    # Update the game state for the next turn
    current_state.current_node_id = next_node_id
    current_state.current_narrative = next_node["narrative"]
    current_state.choices = next_node["choices"]
    current_state.game_over = next_node.get("game_over", False)
    
    # Update resources
    current_state.energy -= 5 # Fixed energy cost per choice
    current_state.data_units += 10 # Fixed data gain per choice

    if current_state.energy <= 0:
        current_state.game_over = True
        current_state.current_narrative = "Your energy has depleted. The simulation is over."
        current_state.choices = []

    if current_state.game_over:
        # The game is over, just use the narrative from the end node
        current_state.current_narrative = next_node["narrative"]


    return current_state
