export type Locale = "sv" | "en";

export type UiText = {
  appTitle: string;
  appSubtitle: string;
  languageLabel: string;
  printLayoutLabel: string;
  printLayoutButton: string;
  workflowLayoutButton: string;
  step1Title: string;
  step2Title: string;
  step3Title: string;
  step4Title: string;
  step5Title: string;
  uploadLabel: string;
  clearImageLabel: string;
  startCornersButton: string;
  restartCornersButton: string;
  rectifyButton: string;
  stirlingOffLabel: string;
  stirlingOnLabel: string;
  tColdLabel: string;
  tHotLabel: string;
  stirlingWorkLabel: string;
  noImageText: string;
  previewAlt: string;
  startContourButton: string;
  restartContourButton: string;
  pixelAreaLabel: string;
  calibratedAreaLabel: string;
  uploadHelp: string;
  rectifyHelp: string;
  calibrationHelp: string;
  contourHelp: string;
  stirlingHelp: string;
  pixelAreaHelp: string;
  calibratedAreaHelp: string;
  stirlingPressureWarning: string;
  reportValuesTitle: string;
  reportEnteredTitle: string;
  reportCalculatedTitle: string;
  reportImageTitle: string;
  reportDeltaVLabel: string;
  reportRatioLabel: string;
  reportVMinLabel: string;
  reportVMaxLabel: string;
  reportPMinLabel: string;
  reportPMaxLabel: string;
  reportTColdLabel: string;
  reportTHotLabel: string;
  reportPixelAreaLabel: string;
  reportMeasuredWorkLabel: string;
  reportIdealWorkLabel: string;
  copyrightText: string;
};

export const messages: Record<Locale, UiText> = {
  sv: {
    appTitle: "Analys av Stirlingmotorn",
    appSubtitle: "Stegvis arbetsflöde for bilduppladdning, normalisering, kalibrering, mätning och analys.",
    languageLabel: "Sprak",
    printLayoutLabel: "Layoutläge",
    printLayoutButton: "Utskriftslayout",
    workflowLayoutButton: "Arbetsflöde",
    step1Title: "1. Ladda upp en bild av din whiteboard",
    step2Title: "2. Räta upp bilden",
    step3Title: "3. Kalibrera skalan",
    step4Title: "4. Rita kontur",
    step5Title: "5. Ideal Stirlingprocess",
    uploadLabel: "Välj bild",
    clearImageLabel: "Rensa",
    startCornersButton: "Välj hörn",
    restartCornersButton: "Börja om",
    rectifyButton: "Räta upp bilden",
    stirlingOffLabel: "AV",
    stirlingOnLabel: "PÅ",
    tColdLabel: "T_kall",
    tHotLabel: "T_varm",
    stirlingWorkLabel: "Idealt arbete",
    noImageText: "Ingen bild laddad ännu.",
    previewAlt: "Förhandsvisning av uppladdad bild",
    startContourButton: "Rita kontur",
    restartContourButton: "Nollställ kontur",
    pixelAreaLabel: "Area i pixlar",
    calibratedAreaLabel: "Beräknat arbete",
    uploadHelp: "Ladda upp ett foto av tavlan eller diagrammet som ska analyseras. Bilden bör visa hela rutnätet och hela den ritade kurvan så tydligt som möjligt.",
    rectifyHelp: "Markera whiteboardens fyra hörn i bilden (eller en mindre rektangel). Om ett hörn hamnar lite fel kan du dra punkten till rätt plats innan du klickar på knappen för att räta upp bilden.",
    calibrationHelp: "Fyll i de kända värdena för volym och tryck. Observera att kompressionsgraden r är okänd just nu. Markera sedan de två punkterna i bilden som motsvarar kalibreringspunkterna (V_min, p_max) och (V_max, p_min), så att appen kan omvandla pixlar till fysiska enheter.",
    contourHelp: "Klicka stegvis längs den skissade figurens ytterkontur. När du klickar på startpunkten igen stängs kurvan, och därefter kan du dra i befintliga punkter eller klicka på en kant för att lägga till en ny punkt.",
    stirlingHelp: "Aktivera detta steg för att visa en idealiserad Stirlingprocess ovanpå den kalibrerade bilden. Processen beräknas från V_min, V_max, p_min, T_kall och T_varm. Justera temperaturerna och kompressionsfaktorn r för att få en bra anpassning. När Stirling-figuren är på låses den manuella konturen för redigering.",
    pixelAreaHelp: "Detta är arean inuti den ritade konturen, uttryckt direkt i bildpixlar. Mest användbart som en geometrisk kontroll innan kalibreringen är klar.",
    calibratedAreaHelp: "Detta är samma inritade area omräknad med hjälp av pV-kalibreringen. Resultatet visas som energi i mJ och är det värde som ska användas vidare i analysen. Observera att antalet värdesiffror är orimligt stort.",
    stirlingPressureWarning: "Ange ett rimligt p_min-värde.",
    reportValuesTitle: "Sammanställning",
    reportEnteredTitle: "Inmatade värden",
    reportCalculatedTitle: "Beräknade värden",
    reportImageTitle: "Diagram",
    reportDeltaVLabel: "ΔV",
    reportRatioLabel: "r",
    reportVMinLabel: "V_min",
    reportVMaxLabel: "V_max",
    reportPMinLabel: "p_min",
    reportPMaxLabel: "p_max",
    reportTColdLabel: "T_kall",
    reportTHotLabel: "T_varm",
    reportPixelAreaLabel: "Area i pixlar",
    reportMeasuredWorkLabel: "Uppmätt arbete",
    reportIdealWorkLabel: "Idealt Stirling-arbete",
    copyrightText: "Fysiska institutionen, Lunds universitet, 2026 – martin.magnusson@fysik.lu.se",
  },
  en: {
    appTitle: "Stirling Engine Analysis",
    appSubtitle: "Step-by-step workflow for upload, normalization, calibration, measurement and analysis.",
    languageLabel: "Language",
    printLayoutLabel: "Layout mode",
    printLayoutButton: "Print layout",
    workflowLayoutButton: "Workflow",
    step1Title: "1. Upload image",
    step2Title: "2. Rectify image",
    step3Title: "3. Calibrate scale",
    step4Title: "4. Draw contour",
    step5Title: "5. Ideal Stirling process",
    uploadLabel: "Choose image",
    clearImageLabel: "Clear",
    startCornersButton: "Start corner selection",
    restartCornersButton: "Start over",
    rectifyButton: "Rectify image",
    stirlingOffLabel: "OFF",
    stirlingOnLabel: "ON",
    tColdLabel: "T_cold",
    tHotLabel: "T_hot",
    stirlingWorkLabel: "Ideal work",
    noImageText: "No image uploaded yet.",
    previewAlt: "Preview of uploaded image",
    startContourButton: "Start contour",
    restartContourButton: "Restart contour",
    pixelAreaLabel: "Pixel area",
    calibratedAreaLabel: "Estimated work",
    uploadHelp: "Upload a photo of the whiteboard or diagram you want to analyze. The image should show the full grid and the full drawn loop as clearly as possible.",
    rectifyHelp: "Start by marking the four corners of the whiteboard in the image (or a smaller rectangle). If a corner is slightly off, you can drag it into place before you press the button to rectify the image.",
    calibrationHelp: "Enter the known values for volume and pressure. Note that the compression ratio r is unknown. Then mark the two points in the image that correspond to the calibration points (V_min, p_max) and (V_max, p_min), so the app can convert pixels into physical units.",
    contourHelp: "Click step by step along the outer contour of the sketched figure. When you click the starting point again the curve closes, and only after that can you drag existing points or click on an edge to insert a new one.",
    stirlingHelp: "Enable this step to display an ideal Stirling process on top of the calibrated image. The process is computed from V_min, V_max, p_min, T_cold, and T_hot. Modify the temperatures and the compression ratio r to get a good fit. When the Stirling overlay is on, the manual contour is locked from editing.",
    pixelAreaHelp: "This is the area enclosed by the drawn contour measured directly in image pixels. It is mainly useful as a geometric check before the physical calibration is complete.",
    calibratedAreaHelp: "This is the same enclosed area converted using the PV calibration. The result is shown as energy in millijoules and is the value intended for further analysis. Note that the number of significant digits is unreasonably large.",
    stirlingPressureWarning: "Please enter a reasonable p_min value.",
    reportValuesTitle: "Summary",
    reportEnteredTitle: "Entered values",
    reportCalculatedTitle: "Calculated values",
    reportImageTitle: "Diagram",
    reportDeltaVLabel: "ΔV",
    reportRatioLabel: "r",
    reportVMinLabel: "V_min",
    reportVMaxLabel: "V_max",
    reportPMinLabel: "p_min",
    reportPMaxLabel: "p_max",
    reportTColdLabel: "T_cold",
    reportTHotLabel: "T_hot",
    reportPixelAreaLabel: "Pixel area",
    reportMeasuredWorkLabel: "Measured work",
    reportIdealWorkLabel: "Ideal Stirling work",
    copyrightText: "Department of Physics, Lund University, 2026 – martin.magnusson@fysik.lu.se",
  }
};
