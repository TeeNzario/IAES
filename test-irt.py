import numpy as np
import pandas as pd

# ==========================================
# STRICT REALISTIC IRT 3PL CAT SIMULATION
# CORRECTED VERSION
# - Fixed c = 0.25
# - Correct Fisher Information
# - Proper CAT item selection
# ==========================================

np.random.seed(42)

import pandas as pd
import numpy as np

# ==========================================
# STEP 1: CREATE FIXED MOCK ITEM BANK
# (Use this once at the top of your CAT system)
# ==========================================

item_data = [

    # EASY
    ["E1",  "Easy",   0.85, -2.90, 0.25],
    ["E2",  "Easy",   0.90, -2.65, 0.25],
    ["E3",  "Easy",   0.95, -2.40, 0.25],
    ["E4",  "Easy",   1.00, -2.20, 0.25],
    ["E5",  "Easy",   1.05, -2.00, 0.25],
    ["E6",  "Easy",   1.10, -1.80, 0.25],
    ["E7",  "Easy",   1.15, -1.60, 0.25],
    ["E8",  "Easy",   1.20, -1.40, 0.25],
    ["E9",  "Easy",   1.25, -1.20, 0.25],
    ["E10", "Easy",   1.30, -1.00, 0.25],

    # MEDIUM
    ["M1",  "Medium", 1.80, -0.90, 0.25],
    ["M2",  "Medium", 1.95, -0.70, 0.25],
    ["M3",  "Medium", 2.10, -0.50, 0.25],
    ["M4",  "Medium", 2.25, -0.30, 0.25],
    ["M5",  "Medium", 2.40, -0.10, 0.25],
    ["M6",  "Medium", 2.40,  0.10, 0.25],
    ["M7",  "Medium", 2.25,  0.30, 0.25],
    ["M8",  "Medium", 2.10,  0.50, 0.25],
    ["M9",  "Medium", 1.95,  0.70, 0.25],
    ["M10", "Medium", 1.80,  0.90, 0.25],

    # HARD
    ["H1",  "Hard",   1.70,  1.00, 0.25],
    ["H2",  "Hard",   1.75,  1.20, 0.25],
    ["H3",  "Hard",   1.80,  1.40, 0.25],
    ["H4",  "Hard",   1.85,  1.60, 0.25],
    ["H5",  "Hard",   1.90,  1.80, 0.25],
    ["H6",  "Hard",   1.90,  2.00, 0.25],
    ["H7",  "Hard",   1.85,  2.20, 0.25],
    ["H8",  "Hard",   1.80,  2.40, 0.25],
    ["H9",  "Hard",   1.75,  2.70, 0.25],
    ["H10", "Hard",   1.70,  3.00, 0.25],
]

item_bank = pd.DataFrame(
    item_data,
    columns=["ItemID", "Difficulty", "a", "b", "c"]
)

item_bank = item_bank.sort_values(by="b").reset_index(drop=True)

# ==========================================
# STEP 2:
# REMOVE RANDOM GENERATION SECTION
# ==========================================

# DELETE this from old code:
# NUM_ITEMS = 500
# b_values = ...
# a_values = ...
# c_values = ...

# REPLACE WITH:
# item_bank = mock bank above

# ==========================================
# STEP 4:
# CAT Selection uses same logic
# ==========================================

administered_items = []

def select_next_item(theta_est):

    remaining_items = item_bank.drop(index=administered_items)

    # First item near b=0
    if len(administered_items) == 0:
        return (remaining_items['b'].abs()).idxmin()

    infos = remaining_items.apply(
        lambda row: fisher_information(
            theta_est,
            row['a'],
            row['b'],
            row['c']
        ),
        axis=1
    )

    return infos.idxmax()

# ==========================================
# RESULT:
# Your full CAT engine now runs entirely
# from structured mock data instead of random data
# ==========================================

# =========================
# 2. Forced Response Pattern (20 items)
# Scenario:
# Perfect scorer (ตอบถูกทุกข้อ)
# =========================

forced_responses = [1] * 20

# Equivalent to:
# forced_responses = [
#     1,1,1,1,1,
#     1,1,1,1,1,
#     1,1,1,1,1,
#     1,1,1,1,1
# ]
# =========================
# 3. Initial Setup
# =========================
theta_est = 0.0
administered_items = []
responses = []

# =========================
# 4. 3PL Probability
# =========================
def probability_3pl(theta, a, b, c):
    exp_term = np.exp(np.clip(-a * (theta - b), -50, 50))
    return c + (1 - c) / (1 + exp_term)

# =========================
# 5. CORRECT Fisher Information
# =========================
def fisher_information(theta, a, b, c):
    P = probability_3pl(theta, a, b, c)

    # Prevent numerical instability
    if P <= c or P >= 0.999999:
        return 0.0

    term1 = a ** 2
    term2 = ((P - c) / (1 - c)) ** 2
    term3 = (1 - P) / P

    return term1 * term2 * term3

# =========================
# 6. Score Function
# =========================
def score_function(theta, administered_items, responses):
    score = 0.0

    for idx, u in zip(administered_items, responses):

        a = item_bank.loc[idx, 'a']
        b = item_bank.loc[idx, 'b']
        c = item_bank.loc[idx, 'c']

        P = probability_3pl(theta, a, b, c)

        L = 1 / (1 + np.exp(np.clip(-a * (theta - b), -50, 50)))
        P_prime = (1 - c) * a * L * (1 - L)

        denominator = P * (1 - P)

        if denominator <= 1e-10:
            continue

        score += (P_prime * (u - P)) / denominator

    return score

# =========================
# 7. Correct Test Information
# =========================
def test_information(theta, administered_items):
    info = 0.0

    for idx in administered_items:

        a = item_bank.loc[idx, 'a']
        b = item_bank.loc[idx, 'b']
        c = item_bank.loc[idx, 'c']

        info += fisher_information(theta, a, b, c)

    return info

# =========================
# 8. Improved Stable Theta Update
# ลดความ aggressive ช่วงต้น
# =========================

def update_theta(theta_old, administered_items, responses):

    S = score_function(theta_old, administered_items, responses)
    I = test_information(theta_old, administered_items)

    # Prevent division issues
    if I <= 1e-6:
        return theta_old

    # -----------------------------
    # Raw Newton-Raphson step
    # -----------------------------
    step = S / I

    # -----------------------------
    # EARLY TEST STABILIZATION
    # ช่วงข้อแรก ๆ ให้ขยับช้าลง
    # -----------------------------
    num_items = len(administered_items)

    if num_items <= 5:
        max_step = 0.35
    elif num_items <= 10:
        max_step = 0.45
    else:
        max_step = 0.50

    step = np.clip(step, -max_step, max_step)

    # -----------------------------
    # Optional Bayesian shrinkage
    # ลด extreme theta ช่วงต้น
    # -----------------------------
    shrinkage_factor = 0.92 if num_items < 8 else 0.97

    theta_new = theta_old + step
    theta_new *= shrinkage_factor

    # -----------------------------
    # Theta bounds
    # -----------------------------
    theta_new = np.clip(theta_new, -4.0, 4.0)

    return theta_new
# =========================
# 9. Pure CAT Selection
# =========================
def select_next_item(theta_est):

    remaining_items = item_bank.drop(index=administered_items)

    # First item near b=0
    if len(administered_items) == 0:
        return (remaining_items['b'].abs()).idxmin()

    # Calculate information across ALL remaining items
    infos = remaining_items.apply(
        lambda row: fisher_information(
            theta_est,
            row['a'],
            row['b'],
            row['c']
        ),
        axis=1
    )

    return infos.idxmax()

# =========================
# DYNAMIC CAT SIMULATION WITH THETA PLATEAU
# - Stop when SE is stable + Theta stabilizes
# - Prevents stopping too early
# ==========================

TOTAL_ITEMS = len(item_bank)

# -----------------------------
# Dynamic min/max
# -----------------------------
if TOTAL_ITEMS <= 30:
    MIN_ITEMS = max(8, int(TOTAL_ITEMS * 0.30))
elif TOTAL_ITEMS <= 60:
    MIN_ITEMS = max(12, int(TOTAL_ITEMS * 0.25))
else:
    MIN_ITEMS = max(15, int(TOTAL_ITEMS * 0.20))

MAX_ITEMS = TOTAL_ITEMS
TARGET_SE = 0.35
EXTREME_HIGH =  4
EXTREME_LOW = - 4

# -----------------------------
# CAT loop
# -----------------------------
previous_se = float("inf")
worsening_streak = 0

print("===== IMPROVED DYNAMIC CAT WITH THETA PLATEAU =====\n")

for step in range(len(forced_responses)):

    selected_idx = select_next_item(theta_est)
    administered_items.append(selected_idx)

    # Response
    u = forced_responses[step]
    responses.append(u)

    old_theta = theta_est
    theta_est = update_theta(theta_est, administered_items, responses)

    total_info = test_information(theta_est, administered_items)
    se = 1 / np.sqrt(total_info) if total_info > 0 else np.nan

    # Track SE worsening
    if se > previous_se:
        worsening_streak += 1
    else:
        worsening_streak = 0

    # Theta change for plateau detection
    theta_change = abs(theta_est - old_theta)

    # Output
    print(f"Step {step+1}")
    print(f"Selected Item : {item_bank.loc[selected_idx, 'ItemID']}")
    print(
        f"a={item_bank.loc[selected_idx, 'a']:.3f}, "
        f"b={item_bank.loc[selected_idx, 'b']:.3f}, "
        f"c={item_bank.loc[selected_idx, 'c']:.2f}"
    )
    print(f"Difficulty    : {item_bank.loc[selected_idx, 'Difficulty']}")
    print(f"Response      : {'Correct' if u == 1 else 'Incorrect'}")
    print(f"Theta Before  : {old_theta:.4f}")
    print(f"Theta After   : {theta_est:.4f}")
    print(f"Standard Error: {se:.4f}")
    print("-" * 70)

    # -----------------------------
    # STOP RULE WITH THETA PLATEAU
    # -----------------------------
    stop_reason = None

    if len(administered_items) >= MIN_ITEMS:

        # SE target reached
        if se <= TARGET_SE:
            stop_reason = f"SE threshold reached (SE={se:.4f})"

        # Extreme theta
        elif theta_est >= EXTREME_HIGH:
            stop_reason = f"Extreme high theta reached (Theta={theta_est:.4f})"
        elif theta_est <= EXTREME_LOW:
            stop_reason = f"Extreme low theta reached (Theta={theta_est:.4f})"

        # SE worsening + theta plateau
        elif worsening_streak >= 2 and theta_change < 0.20:
            stop_reason = (
                f"SE worsening streak with Theta plateau "
                f"(Theta change={theta_change:.4f})"
            )

        # Max items
        elif len(administered_items) >= MAX_ITEMS:
            stop_reason = f"Maximum item cap reached ({MAX_ITEMS})"

    if stop_reason:
        print(f"STOP RULE TRIGGERED: {stop_reason}")
        print("-" * 70)
        break

    previous_se = se

# =========================
# FINAL SUMMARY
# =========================
print("\n===== FINAL SUMMARY =====")
print(f"Total Item Bank Size   : {TOTAL_ITEMS}")
print(f"Dynamic MIN_ITEMS      : {MIN_ITEMS}")
print(f"Items Administered     : {len(administered_items)}")
print(f"Final Estimated Theta  : {theta_est:.4f}")
print(f"Total Correct          : {sum(responses)} / {len(responses)}")
print(f"Total Incorrect        : {len(responses)-sum(responses)} / {len(responses)}")
print(f"Final Standard Error   : {se:.4f}")