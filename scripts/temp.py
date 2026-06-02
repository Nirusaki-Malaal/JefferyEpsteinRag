import requests

query = input("Enter your query")


cookie = "ak_bmsc=EFCA02BBCF69E1D82B79B2D13E62AA8F~000000000000000000000000000000~YAAQbfQ3F+HiEj2eAQAAN7kwgB8JbaglKgXQJS84ifydsxF/HRXlelyVsRBrady8ZnwQvlC4D9L98007lb95YM1doZzNsDZSEQAhuJUySNCTs7w+O0WrIg54Kq15wy8DbnCBSyL0AdBSac4tAE9E8pWQ+Vxlqenlg0RskVEX+gi54UMMi7sIHY2eeHJ0Uftx0zour715j1KDGFwLh42F6j3AWF45xJkJTegcWkCkLHWme0PP0BfNKeaAt8lAZrumVwNIUpm/ksPGyRF2Q3xUOxx2TBPOey72xeO5BROChuVZyWFWfTN8It1kx7Y8/ciFJ8sHKXXSN465cltuE1ZHy9zqyNmOZSH2OYbN555GzeRPmv+9nOWFUXt1m4TC1Ev/mNYyp2BZoq2d4yTU8WBm0sSvMpGkeZcr1mfPMtgEnPqNQIyuiM7FDGI1fgK/0s4WWOraexZBsIcDxzNZAS24QILwV4vB7Ml11foH"

headers_1 = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Referer": "https://www.justice.gov/epstein",
    "x-queueit-ajaxpageurl": "https://www.justice.gov/epstein",
    "Connection": "keep-alive",
    "Cookie": cookie,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "DNT": "1",
    "Sec-GPC": "1",
    "Priority": "u=0"
}
#query = '<script>alert("HELLO");</script>'
query = f'https://www.justice.gov/multimedia-search?keys="{query}"&page=1' ## headers
print(query)
response = requests.get(query, headers=headers_1)

print(response.json().get("hits", {}).get("hits", "")[0].get("_source", {}).get("ORIGIN_FILE_URI", ""))
a = response.json().get("hits", {}).get("hits", "")[0].get("_source", {}).get("ORIGIN_FILE_URI", "")
name = response.json().get("hits", {}).get("hits", "")[0].get("_source", {}).get("ORIGIN_FILE_NAME", "")

print(response)

headers = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    #"Referer": "https://www.justice.gov/age-verify?destination=/epstein/files/DataSet%2010/EFTA01854425.pdf",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "DNT": "1",
    "Sec-GPC": "1",
    "Priority": "u=0, i",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache"
}



cookies = {
    "ak_bmsc": "63BE8C972CB34637DEB5EDCD32075A2C~000000000000000000000000000000~YAAQ7/Q3F/qDFnaeAQAAygocggDt+AzeBdbTfV4N8rVsWEtBWO40xW4GjQe6+MrF06CRIP5T55o/jJRElIGjv9CNAkf+pXewEIG0EPdnoQ+ncTdRoOYJfm4BXLzN69sCrps5cs5NyYGoRTeV2VQpzEc8HjurghXfH1FLOQFvMnAPElFHSkPw46QzPKkvW0FGp1/bgtQVyXqFGTjbOyDMw2fq8xZQk1IFf8Nvls42cEDJj2MpfSES97D6hRWgbM97oouJzPjlqnB3ayXRcEXP9bKaCDlczHEw/E35T9Zdiv1yN3WiS92zz4LpICU5fyupQgI0rW674cPOqUN6Tc8/g1zHJvmHjlqJ96/OliSxOMOGlrTq0BojWL+QHFEtZSm2nbZrw0qJecS0lTNlRr5uycrlmc8LveGYqmQhGnkeWO6h6Skug+TPrJ1LOnaInnZ1uudNk4Fet82pIxSQPDHUuw6rbAhl+ZS6b+jfG6tEL9LOujod68x6wALpof5hSw==",
    "justiceGovAgeVerified": "true"
}
reponse = requests.get(a, headers=headers, cookies=cookies)


with open(name, "wb") as file:
    file.write(reponse.content)
