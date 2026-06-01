import pypdfium2 as pdfium
import asyncio
from pdf2image import convert_from_path
import pytesseract, os
try:
    from app.plugins.fetch import API, BASE_URL
except ImportError:
    try:
        from .fetch import API, BASE_URL
    except ImportError:
        from fetch import API, BASE_URL

current_dir = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(current_dir, "..", "..", "ocr_text"))

class OCR:
    async def soft_ocr(self,pdf_path,sem, dicc):
        name = os.path.splitext(dicc["NAME"])[0]
        text_path = f"{BASE_DIR}/{name}.txt"
        if os.path.exists(text_path):
            return {**dicc, "TEXT_PATH" : text_path}

        async with sem:
            doc = pdfium.PdfDocument(pdf_path)
            full_text = []
            has_digital_text = False

            for page in doc:
                text_page = page.get_textpage()
                text = text_page.get_text_bounded()
                if text.strip():
                    has_digital_text = True
                    full_text.append(text)

            if has_digital_text:
                full_text = '\n'.join(full_text)
            else:
                pages = convert_from_path(pdf_path) # returns a list of images of pages from pdf fall back route doesn't work good
                # replace it with paddle ocr in v1.0 stable branch
                full_text = []
                for page in pages:
                    text = pytesseract.image_to_string(page)
                    full_text.append(text)

                    ## 
                full_text = '\n'.join(full_text)
            with open(text_path, "w") as f_d:
                f_d.write(full_text)    
            return {**dicc, "TEXT_PATH" : text_path}
    
    async def extract(self,lst):
        sem = asyncio.Semaphore(3)
        tasks = [self.soft_ocr(diccs.get("PATH", ""),sem, diccs) for diccs in lst]
        return await asyncio.gather(*tasks)
    
if __name__ == "__main__":
    os.makedirs(BASE_DIR, exist_ok=True)
    os.makedirs(BASE_URL, exist_ok=True)

    ocr = OCR()
    api = API()

    links = asyncio.run(api.fetch("hello",10))
    dir = asyncio.run(api.download(links))
    text = asyncio.run(ocr.extract(dir)) ##  dir --> text + chunks:[""]
    
    print(text)