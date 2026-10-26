// Converte cada página de um PDF em JPG + text.txt (usa o PDFKit do macOS, sem instalar nada)
// osascript -l JavaScript tools/pdf2png.js <pdf> <pasta> [largura]
ObjC.import('PDFKit'); ObjC.import('AppKit');
function run(argv){
  var pdf=$.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0]));
  var out=argv[1], W=+(argv[2]||1100), n=pdf.pageCount, text=[];
  for(var i=0;i<n;i++){
    var page=pdf.pageAtIndex(i), b=page.boundsForBox($.kPDFDisplayBoxMediaBox);
    var w=b.size.width,h=b.size.height,s=W/w;
    var img=page.thumbnailOfSizeForBox($.NSMakeSize(w*s,h*s),$.kPDFDisplayBoxMediaBox);
    var rep=$.NSBitmapImageRep.imageRepWithData(img.TIFFRepresentation);
    var data=rep.representationUsingTypeProperties($.NSBitmapImageFileTypeJPEG,$({NSImageCompressionFactor:0.7}));
    var name=out+"/p"+("00"+(i+1)).slice(-3)+".jpg";
    data.writeToFileAtomically(name,true);
    var t=page.string; text.push("=== page "+(i+1)+" ===\n"+(t&&!t.isNil()?ObjC.unwrap(t):""));
  }
  $.NSString.alloc.initWithUTF8String(text.join("\n")).writeToFileAtomicallyEncodingError(out+"/text.txt",true,$.NSUTF8StringEncoding,null);
  return n+" pages";
}
