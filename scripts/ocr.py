import pypdfium2 as pdfium
from pdf2image import convert_from_path
import pytesseract

def extract_text_from_pdf(pdf_path):

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
        return '\n'.join(full_text)
    else:
        pages = convert_from_path(pdf_path) # returns a list of images of pages from pdf
        ocr_text = []
        for page in pages:
            text = pytesseract.image_to_string(page)
            ocr_text.append(text)
        return '\n'.join(ocr_text)
    
if __name__ == "__main__":
    pdf_file = "document.pdf"
    text = extract_text_from_pdf(pdf_file)
    print(text)