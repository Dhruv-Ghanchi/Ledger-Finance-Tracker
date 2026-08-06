import re
line = "16 Jun 19 16 Jun 19 BALANCE FORWARD 114,453.65"
date_patterns = [
    (r"^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})", "dMonY"),
]
for p, f in date_patterns:
    match = re.search(p, line)
    print(p, match)
