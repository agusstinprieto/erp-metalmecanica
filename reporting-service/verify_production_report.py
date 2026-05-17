import pymupdf

def verify_pdf(filename):
    try:
        doc = pymupdf.open(filename)
        text = ""
        for page in doc:
            text += page.get_text()
        
        # Check for headers
        print("--- Checking Headers ---")
        headers = ["RUTA", "MATERIALES", "RECOGIDAS"]
        for h in headers:
            if h in text:
                print(f"Found header: {h}")
            else:
                # Try case insensitive
                if h.lower() in text.lower():
                    print(f"Found header (case mismatch): {h}")
                else:
                    print(f"Header NOT found: {h}")
        
        # Check for multi-line instructions
        print("\n--- Checking Multi-line Instructions ---")
        instructions = [
            "1.-LIBERACIÓN DE PRIMERA PIEZA POR EL AUDITOR DE CALIDAD.",
            "2.-LIBERACIÓN DEL PROCESO.",
            "AUTOINSPECCIÓN",
            "1.-VERIFICAR DIMENSIONES CONTRA DIBUJO DE LA 1RA PIEZA."
        ]
        for inst in instructions:
            if inst in text:
                print(f"Found instruction: {inst}")
            else:
                # Handle potential encoding issues in verification script
                print(f"Instruction NOT found: {inst}")
        
        doc.close()
    except Exception as e:
        print(f"Error verifying PDF: {e}")

if __name__ == "__main__":
    verify_pdf("production_report_test.pdf")
