import requests
from playwright.sync_api import sync_playwright

def get_cookie_website():
    with sync_playwright() as p:
        cookie = ""
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.justice.gov/epstein/search")
        page.wait_for_timeout(3000)
        cookies = page.context.cookies()
        for c in cookies:
            if c["name"] == "ak_bmsc":
                cookie = c["value"]
                break
        browser.close()
        return cookie
print(get_cookie_website())

"""
╰─ py3 fetchtoken.py                                                                                                ─╯
0F8D2D14B3565CB5BA165950359B7F11~000000000000000000000000000000~YAAQn9xVuGfisHmeAQAAXOOMggAYicHXlsoe2UF4OeUMNKdpP9R+p3A4kao39Qw3e4qO5XrAAMuLkssdpeGlAFcNJ8qCliH44qjjwjWi0g3aQCAQ7U9+AKlWCgVcbCtCDvD5Yn6Oabmyr0LoKY9JNxOcoOC3d6ObYYVMgRkQKb2G/MgrHcqsN9oT+qC2szu3Y6o1t3WYElEY1dBvduMfI/TfkgztEg9rJsRxdSSojaijzT+FVnfk0QH9zzNqp9mCzaecD7qOFFfOr49vQEPUxtJC/5/4tsHXV35AQnW9vyBceX2+cxx7NXSKmwUrtA6kx9MJ4+lKrZfp8XLgOTtvu4iqTf9+d/eKp42exvVTYA9O4k107x8fCo1oBfwQWbwIGc6rA3gS9qWddkvhT67mb0vlhz0hXSyz7DZL0DK1Ds8fRyJPzpAf49X21F4GU5r1SDMF3cfZDxQJDkbDMAjgilLHvHLsUbmCnwNJpXj2lCJBUK3cAmXUq3JRoQ==
"""