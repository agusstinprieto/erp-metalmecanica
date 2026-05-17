using PdfSharp.Fonts;
using System.IO;

namespace McVill.ReportService.Reports
{
    public class McVillFontResolver : IFontResolver
    {
        public byte[] GetFont(string faceName)
        {
            var fileName = faceName switch
            {
                "LiberationSans#Regular" => "LiberationSans-Regular.ttf",
                "LiberationSans#Bold" => "LiberationSans-Bold.ttf",
                "LiberationSans#Italic" => "LiberationSans-Italic.ttf",
                "LiberationSans#BoldItalic" => "LiberationSans-BoldItalic.ttf",
                _ => "LiberationSans-Regular.ttf"
            };

            var path = Path.Combine(AppContext.BaseDirectory, "Assets", "Fonts", fileName);
            if (!File.Exists(path))
            {
                // Fallback a la carpeta local si no está en bin (para dev)
                path = Path.Combine(Directory.GetCurrentDirectory(), "Assets", "Fonts", fileName);
            }

            return File.ReadAllBytes(path);
        }

        public FontResolverInfo ResolveTypeface(string familyName, bool isBold, bool isItalic)
        {
            // Mapeamos Arial y otras a LiberationSans para máxima compatibilidad
            string faceName = "LiberationSans";
            
            if (isBold && isItalic) faceName += "#BoldItalic";
            else if (isBold) faceName += "#Bold";
            else if (isItalic) faceName += "#Italic";
            else faceName += "#Regular";

            return new FontResolverInfo(faceName);
        }
    }
}
