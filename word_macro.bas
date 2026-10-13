'========================================================
'   ByVal / ByRef    ByVal passes a copy; ByRef passes the original so
'                    the procedure can change the caller's variable.
'   Exit For / Exit Function / Exit Sub   leave early.
'   GoTo Label       jump to a label (used here as a "continue" in loops).
'   &                joins (concatenates) text.   vbCr = paragraph mark.
'   _  (at line end) the statement continues on the next line.
'   With obj ... End With      saves retyping obj. on every line.
'   Word objects: ActiveDocument = the open doc; .Paragraphs, .Sections,
'   .Range (a stretch of the document from Start to End position),
'   .Find (search/replace engine), .Selection (the blinking cursor).
'   In Find text: ^p = paragraph mark, ^l = manual line break,
'   ^s = non-breaking space, ^b = section break, ^+ = em dash.
'========================================================

Sub TypesetFormattingMacro()
MsgBox "Let's get started! This can take a few minutes. Please be patient while the macro does its thing. ", vbInformation + vbOKOnly, "Macro Start"
Application.ScreenUpdating = False
 ' Make every section's footer sit 1.02 cm from the page bottom.
Dim sec49 As Section
For Each sec49 In ActiveDocument.Sections
        sec49.PageSetup.FooterDistance = Application.CentimetersToPoints(1.02)
Next sec49
Selection.Find.ClearFormatting
Selection.Find.Replacement.ClearFormatting
ReplaceAllText Selection.Range, "^s", " ", wdFindContinue
ReplaceAllText Selection.Range, "^l", "^p", wdFindContinue
ReplaceAllText Selection.Range, "^l^l", "^p", wdFindContinue
ReplaceAllText Selection.Range, "^l ^l", "^p", wdFindContinue
' savedText24 is for "Author's Notes" section at the very end.
Dim savedText24 As String
savedText24 = ""

'========================================================
' CAPTURE CHAPTER END NOTES BEFORE CLEANUP
'========================================================
' The cleanup code below removes the AO3 Chapter Text / Notes markers.
' Capture the real post-Chapter-Text notes now, while those markers still exist.
' A Collection is like a list you can Add items to. Each item is the text
' of one chapter's summary/notes. (Function is defined near the bottom.)
Dim chapterCollection96 As Collection
Set chapterCollection96 = BuildAppendixCollection(ActiveDocument)

' Remove hyperlinks but keep their visible text
Dim oField As Field
    For Each oField In ActiveDocument.Fields
        If oField.Type = wdFieldHyperlink Then
           oField.Unlink
        End If
    Next
Dim Year1 As String
Dim Year2 As String
Dim Fandom As String
Dim Rating As String
Dim WordCount As String
Dim HitCount As String
Dim KudosCount As String
Dim Blurb As String
' PAGE SETUP: 6x9 inch book trim size with mirrored margins (inner/outer
' instead of left/right, like a printed book) plus a binding gutter.
With ActiveDocument.PageSetup
    .PageWidth = InchesToPoints(6)    ' Word measures in points; 72 pts = 1 inch
    .PageHeight = InchesToPoints(9)
    .MirrorMargins = True
    .LeftMargin = InchesToPoints(0.75)
    .RightMargin = InchesToPoints(0.65)
    .TopMargin = InchesToPoints(0.7)
    .BottomMargin = InchesToPoints(0.75)
    .Gutter = InchesToPoints(0.1)
    .HeaderDistance = InchesToPoints(0.35)
    .FooterDistance = InchesToPoints(0.4)
End With
' STYLES: redefine Word's built-in styles so everything inherits book formatting.
' Normal = body text: 10.5pt Sabon, justified, 0.2" first-line indent,
' exactly 12.6pt line spacing (exact spacing keeps lines aligned page to page).
With ActiveDocument.Styles(wdStyleNormal)
    With .Font
        .Name = "Sabon Next LT"
        .Size = 10.5
        .Bold = False
        .Italic = False
        .Underline = wdUnderlineNone
        .Color = wdColorBlack
    End With
    With .ParagraphFormat
        .alignment = wdAlignParagraphJustify
        .LeftIndent = 0
        .RightIndent = 0
        .FirstLineIndent = InchesToPoints(0.2)
        .spaceBefore = 0
        .spaceAfter = 0
        .LineSpacingRule = wdLineSpaceExactly
        .LineSpacing = 12.6
        .WidowControl = True
        .KeepTogether = False
        .OutlineLevel = wdOutlineLevelBodyText
    End With
End With
' Heading 1 = chapter titles (19pt, centered, kept with the next paragraph).
With ActiveDocument.Styles(wdStyleHeading1)
    With .Font
        .Name = "Sabon Next LT"
        .Size = 19
        .Bold = False
        .Italic = False
        .Underline = wdUnderlineNone
        .Color = wdColorBlack
    End With
    With .ParagraphFormat
        .alignment = wdAlignParagraphCenter
        .LeftIndent = 0
        .RightIndent = 0
        .FirstLineIndent = 0
        .spaceBefore = 0
        .spaceAfter = 30
        .LineSpacingRule = wdLineSpacingSingle
        .keepWithNext = True     ' never leave a heading alone at the bottom of a page
        .KeepTogether = True
        .PageBreakBefore = False
        .OutlineLevel = wdOutlineLevel1
    End With
End With
' Heading 2 = book title on the title page (32pt).
With ActiveDocument.Styles(wdStyleHeading2)
    With .Font
        .Name = "Sabon Next LT"
        .Size = 32
        .Bold = False
        .Italic = False
        .Underline = wdUnderlineNone
        .Color = wdColorBlack
    End With
    With .ParagraphFormat
        .alignment = wdAlignParagraphCenter
        .LeftIndent = 0
        .RightIndent = 0
        .FirstLineIndent = 0
        .spaceBefore = 0
        .spaceAfter = 18
        .LineSpacingRule = wdLineSpacingSingle
        .keepWithNext = True
        .KeepTogether = True
    End With
End With
' Heading 3 = author name under the title (13pt).
With ActiveDocument.Styles(wdStyleHeading3)
    With .Font
        .Name = "Sabon Next LT"
        .Size = 13
        .Bold = False
        .Italic = False
        .Underline = wdUnderlineNone
        .Color = wdColorBlack
    End With
    With .ParagraphFormat
        .alignment = wdAlignParagraphCenter
        .LeftIndent = 0
        .RightIndent = 0
        .FirstLineIndent = 0
        .spaceBefore = 0
        .spaceAfter = 0
        .LineSpacingRule = wdLineSpacingSingle
        .KeepTogether = True
    End With
End With
' Heading 4 = chapter titles inside the Author's Notes section (bold 12pt).
With ActiveDocument.Styles(wdStyleHeading4)
    With .Font
        .Name = "Sabon Next LT"
        .Size = 12
        .Bold = True
        .Italic = False
        .Underline = wdUnderlineNone
        .Color = wdColorBlack
    End With
    With .ParagraphFormat
        .alignment = wdAlignParagraphCenter
        .LeftIndent = 0
        .RightIndent = 0
        .FirstLineIndent = 0
        .spaceBefore = 24
        .spaceAfter = 12
        .LineSpacingRule = wdLineSpacingSingle
        .keepWithNext = True
        .KeepTogether = True
    End With
End With
' Heading 5 = small bold-italic labels like "Notes:" / "Summary:".
With ActiveDocument.Styles(wdStyleHeading5)
    With .Font
        .Name = "Sabon Next LT"
        .Size = 10.5
        .Bold = True
        .Italic = True
        .Underline = wdUnderlineNone
        .Color = wdColorBlack
    End With
    With .ParagraphFormat
        .alignment = wdAlignParagraphLeft
        .LeftIndent = 0
        .RightIndent = 0
        .FirstLineIndent = 0
        .spaceBefore = 14
        .spaceAfter = 4
        .LineSpacingRule = wdLineSpacingSingle
        .keepWithNext = True
        .KeepTogether = True
    End With
End With
' Subtitle = the small centered 9pt text on the info/copyright page.
With ActiveDocument.Styles(wdStyleSubtitle)
    With .Font
        .Name = "Sabon Next LT"
        .Size = 9
        .Bold = False
        .Italic = False
        .Underline = wdUnderlineNone
        .Color = wdColorBlack
    End With
    With .ParagraphFormat
        .alignment = wdAlignParagraphCenter
        .LeftIndent = 0
        .RightIndent = 0
        .FirstLineIndent = 0
        .LineSpacingRule = wdLineSpacingSingle
        .spaceBefore = 0
        .spaceAfter = 0
    End With
End With

ActiveDocument.Range.style = wdStyleNormal

Dim doc90 As Document
Dim sepIdx As Long       ' paragraph number of the "-------" separator line
Dim chapIdx As Long      ' paragraph number of the first "Chapter N" heading
Dim storyIdx As Long     ' paragraph number where the actual story begins
Dim hdrLimit As Long     ' only search this many paragraphs for header keys
Set doc90 = ActiveDocument

sepIdx = FindSeparatorIndex(doc90)
chapIdx = FindFirstChapterIndex(doc90, sepIdx)
If sepIdx > 0 Then
    hdrLimit = sepIdx - 1
Else
    hdrLimit = 60
End If

' Pull Title and Author from the header and clean them up.
Dim titleLine68 As String
Dim authorLine68 As String
titleLine68 = GetHeaderValue(doc90, "Title", hdrLimit)
' titleLine68 = Replace(titleLine68, Chr(160), "")
titleLine68 = Trim(Replace(titleLine68, "/", ""))
authorLine68 = GetHeaderValue(doc90, "Author", hdrLimit)
' authorLine68 = Trim(Replace(authorLine68, Chr(160), " "))

' Document Variables are name/value pairs saved INSIDE the document. They let
' the macro stash data and read it back much later.
' Trick: try to set the variable; if it doesn't exist yet, that raises an
' error, so we catch it and Add it instead.
On Error Resume Next            ' "ignore errors and keep going"
ActiveDocument.Variables("Title").value = titleLine68
If Err.Number <> 0 Then         ' Err.Number <> 0 means the last line failed
    Err.Clear
    ActiveDocument.Variables.Add Name:="Title", value:=titleLine68
End If
ActiveDocument.Variables("Author").value = authorLine68
If Err.Number <> 0 Then
    Err.Clear
    ActiveDocument.Variables.Add Name:="Author", value:=authorLine68
End If
On Error GoTo 0                 ' turn normal error handling back on

Dim Relationship As String
Dim SeriesPart As String
Dim pubStr As String
Dim updStr As String
Dim chapStr As String
Dim relRaw As String
Dim relParts() As String
Dim relI As Long
Dim relCount As Long
Dim sumText As String
Dim notesText As String

Blurb = ""
SeriesPart = ""
Relationship = ""

pubStr = GetHeaderValue(doc90, "Published", hdrLimit)
updStr = GetHeaderValue(doc90, "Updated", hdrLimit)
If updStr = "" Then updStr = GetHeaderValue(doc90, "Completed", hdrLimit)
chapStr = GetHeaderValue(doc90, "Chapters", hdrLimit)

' Year1 = first 4 characters of the publish date, e.g. "2021-05-03" -> "2021".
If Len(pubStr) >= 4 Then Year1 = Left$(pubStr, 4)
' "Completed in" is only shown for finished multi-chapter works (e.g. Chapters: 25/25).
If IsWorkComplete(chapStr) And Len(updStr) >= 4 Then Year2 = Left$(updStr, 4)

Fandom = GetHeaderValue(doc90, "Fandoms", hdrLimit)
If Fandom = "" Then Fandom = GetHeaderValue(doc90, "Fandom", hdrLimit)
Fandom = Fandom & vbCr     ' vbCr = paragraph mark, appended so it ends a line later

Rating = GetHeaderValue(doc90, "Rating", hdrLimit) & vbCr
WordCount = GetHeaderValue(doc90, "Words", hdrLimit) & vbCr
HitCount = GetHeaderValue(doc90, "Hits", hdrLimit) & vbCr
KudosCount = GetHeaderValue(doc90, "Kudos", hdrLimit) & vbCr

Relationship = GetHeaderValue(doc90, "Relationships", hdrLimit)

' Series (only if the export includes a "Series:" line).
SeriesPart = FormatSeries(GetHeaderValue(doc90, "Series", hdrLimit))

' Summary / Author's notes sitting between the separator line and Chapter 1.
' SplitSummaryAndNotes fills sumText and notesText (they're ByRef) and storyIdx.
SplitSummaryAndNotes doc90, sepIdx, storyIdx, GetHeaderValue(doc90, "Summary", hdrLimit), sumText, notesText
Blurb = sumText
If Len(sumText) > 0 Then savedText24 = "Summary:" & vbCr & sumText
If Len(notesText) > 0 Then savedText24 = savedText24 & "Notes:" & vbCr & notesText

'========================================================
' REMOVE EVERYTHING BEFORE THE STORY
'========================================================
' Delete from the doc start to just before the story's first paragraph.
' NOTE: storyIdx is also assigned elsewhere in the original design; here it
' is only used if > 0.
If storyIdx > 0 Then
    Dim prevParStart As Long
    prevParStart = doc90.paragraphs(storyIdx).Range.Start
    If prevParStart > 1 Then doc90.Range(0, prevParStart - 1).Delete
End If

' --- Turn "Chapter N: title" lines into Heading 1 + insert section breaks ---
' (para is not declared, so VBA makes it a Variant. That works, but adding
'  "Option Explicit" at the top of a module forces you to declare everything.)
Dim rng1 As Range
Dim firstChapterFound As Boolean
Dim splitText() As String
Dim chapterPart As String
Dim splitChapterPart() As String
Dim lastChapterNumber As String
Set rng1 = ActiveDocument.Content
firstChapterFound = False
For Each para In ActiveDocument.paragraphs
    ' Split the paragraph on ":" -> "Chapter 3: The Storm" gives ["Chapter 3", " The Storm"]
    splitText = Split(para.Range.Text, ":")
    If UBound(splitText) >= 0 Then      ' UBound = highest index of the array
        chapterPart = Trim$(splitText(0))
        If InStr(chapterPart, " ") > 0 Then ' InStr = "find position of text"; >0 means found
            splitChapterPart = Split(chapterPart, " ")   ' ["Chapter", "3"]
            If UBound(splitChapterPart) >= 1 And splitChapterPart(0) = "Chapter" And IsNumeric(splitChapterPart(1)) Then
                ' Only act the first time we see each chapter number
                ' (guards against duplicates like a repeated heading).
                If firstChapterFound = False Or splitChapterPart(1) <> lastChapterNumber Then
                    para.Range.Font.Reset
                    para.Range.ParagraphFormat.Reset
                    If firstChapterFound Then
                        ' Every chapter after the first starts in a new section (new page).
                        para.Range.InsertBreak Type:=wdSectionBreakNextPage
                    Else
                        firstChapterFound = True
                    End If
                    para.Range.style = ActiveDocument.Styles(wdStyleHeading1)
                    lastChapterNumber = splitChapterPart(1)
                End If
            End If
        End If
    End If
Next para
' Re-apply Heading 1 cleanly to anything already Heading 1.
For Each para In ActiveDocument.paragraphs
    If para.Range.style = wdStyleHeading1 Then
        para.Range.Font.Reset
        para.Range.ParagraphFormat.Reset
        para.Range.style = ActiveDocument.Styles(wdStyleHeading1)
    End If
Next para
    ' --- Delete AO3 "Summary:/Notes:" ... "Chapter Text" blocks ---
    ' Idea: when we see a paragraph containing Summary:/Notes: remember it as the
    ' START; when we later see "Chapter Text" remember it as the END; then delete
    ' everything from start to end. A "Chapter N" line resets the markers.
    Dim doc As Document
    Dim rng2 As Range
    Dim startRange As Range
    Dim endRange As Range
    Dim chapterPattern As String
    Dim para11 As Paragraph
    chapterPattern = "Chapter [0-9]+"
    Set doc = ActiveDocument
    Set rng2 = doc.Range(0, 0)
For Each para11 In doc.paragraphs
    Dim textStart As String
    textStart = Trim(Left(para11.Range.Text, 9)) ' first 9 characters, trimmed
    Dim splitText9() As String
    splitText9 = Split(textStart, " ")
    If UBound(splitText9) >= 1 Then
        If splitText9(0) = "Chapter" And IsNumeric(splitText9(1)) Then
            Set startRange = Nothing   ' "Nothing" = "no object assigned"
            Set endRange = Nothing
        End If
    End If
    If (InStr(para11.Range.Text, "Summary:") > 0 Or InStr(para11.Range.Text, "Notes:") > 0) And startRange Is Nothing Then
        Set startRange = para11.Range
    End If
    If InStr(para11.Range.Text, "Chapter Text") > 0 And Not startRange Is Nothing Then
        Set endRange = para11.Range
        If Not endRange Is Nothing Then
            doc.Range(startRange.Start, endRange.End).Delete
            Set startRange = Nothing
            Set endRange = Nothing
        End If
    End If
Next para11
' If a start was found but never an end, delete to the end of the document.
If Not startRange Is Nothing And endRange Is Nothing Then
    doc.Range(startRange.Start, doc.Content.End).Delete
    Set startRange = Nothing
End If
    ' --- Delete from first "Summary" paragraph up to the next paragraph whose
    ' Information(1) = -1. (Information(1) is wdActiveEndAdjustedPageNumber...
    ' in practice this is a "find where the page/section changes" trick.) ---
    Dim sectionStart As Long
    Dim sectionEnd As Long
    Dim foundNotes As Boolean
    foundNotes = False
    For Each para1 In doc.paragraphs
        If foundNotes Then
            If para1.Range.Information(1) = -1 Then
                sectionEnd = para1.Range.Start - 1
                doc.Range(sectionStart, sectionEnd).Delete
                Exit For
            End If
        ElseIf InStr(para1.Range.Text, "Summary") > 0 Then
            foundNotes = True
            sectionStart = para1.Range.Start
        End If
    Next para1
' --- Another pass: delete Notes: ... Chapter Text blocks (and swap them if the
'     two markers were found in reverse order). ---
Dim doc97 As Document
Dim rng9 As Range
Dim startRange97 As Range
Dim endRange97 As Range
Dim tempRange As Range
Dim splitText1() As String
Dim splitChapterPart1() As String
Dim chapterPart1 As String
Dim para97 As Paragraph
Dim nextPara97 As Paragraph
Set doc97 = ActiveDocument
Set rng9 = doc97.Range(0, 0)
For Each para97 In doc97.paragraphs
    splitText1 = Split(para97.Range.Text, ":")
    If InStr(para97.Range.Text, "Notes:") > 0 Then
        Set startRange97 = para97.Range
    End If
    If InStr(para97.Range.Text, "Chapter Text") > 0 Then
        Set endRange97 = para97.Range
    End If
    If UBound(splitText1) >= 0 Then
        chapterPart1 = Trim$(splitText1(0))
        If InStr(chapterPart1, " ") > 0 Then
            splitChapterPart1 = Split(chapterPart1, " ")
            If UBound(splitChapterPart1) >= 1 And splitChapterPart1(0) = "Chapter" And IsNumeric(splitChapterPart1(1)) Then
                Set startRange97 = Nothing
                Set endRange97 = Nothing
            End If
        End If
    End If
    ' If the start ended up AFTER the end, swap them (classic "swap using a temp variable").
    If Not startRange97 Is Nothing And Not endRange97 Is Nothing Then
        If startRange97.Start > endRange97.End Then
            Set tempRange = startRange97
            Set startRange97 = endRange97
            Set endRange97 = tempRange
        End If
    End If
    If Not startRange97 Is Nothing And Not endRange97 Is Nothing Then
        If startRange97.Start < endRange97.End Then
            doc97.Range(startRange97.Start, endRange97.End).Delete
        End If
        Set startRange97 = Nothing
        Set endRange97 = Nothing
    End If
    ' If this is a chapter heading and the NEXT paragraph is "Chapter Text", delete that line.
    If UBound(splitText1) >= 0 Then
        chapterPart1 = Trim$(splitText1(0))
        If InStr(chapterPart1, " ") > 0 Then
            splitChapterPart1 = Split(chapterPart1, " ")
            If UBound(splitChapterPart1) >= 1 And splitChapterPart1(0) = "Chapter" And IsNumeric(splitChapterPart1(1)) Then
                If para97.Range.Start <> doc97.Content.End Then
                    Set nextPara97 = para97.Next
                    If InStr(nextPara97.Range.Text, "Chapter Text") > 0 Then
                        nextPara97.Range.Delete
                    End If
                End If
                Set nextPara97 = Nothing
            End If
        End If
    End If
Next para97
    ' --- Same "delete from Notes up to the page/section change" trick as above ---
    Dim sectionStart9 As Long
    Dim sectionEnd9 As Long
    Dim foundNotes9 As Boolean
    foundNotes9 = False
    For Each para2 In doc.paragraphs
        If foundNotes9 Then
            If para2.Range.Information(1) = -1 Then
                sectionEnd9 = para2.Range.Start - 1
                doc.Range(sectionStart9, sectionEnd9).Delete
                Exit For
            End If
        ElseIf InStr(para2.Range.Text, "Notes") > 0 Then
            foundNotes9 = True
            sectionStart9 = para2.Range.Start
        End If
    Next para2
' --- Using Find in a loop: each time "Notes:" is found, delete from there to
'     the next section break (^b). Only runs if there's more than one section. ---
Dim rng44 As Range
Dim findRange As Range
Dim sectionRange As Range
Dim startPos1 As Long
Dim endPos As Long
If ActiveDocument.Sections.count > 1 Then
    Set rng44 = ActiveDocument.Range(ActiveDocument.Sections(1).Range.Start, _
                                     ActiveDocument.Sections(ActiveDocument.Sections.count - 1).Range.End)
    Set findRange = rng44.Duplicate      ' Duplicate = independent copy of a Range
    With findRange.Find
        .Text = "Notes:"
        .MatchCase = False
        .Wrap = wdFindStop
        Do While .Execute                ' Execute returns True while it keeps finding matches
            startPos1 = findRange.Start
            endPos = findRange.End
            Set rng44 = ActiveDocument.Range(endPos, ActiveDocument.Content.End)
            With rng44.Find
                .ClearFormatting
                .Text = "^b"            ' ^b = section break
                .MatchWildcards = False
                .Wrap = wdFindStop
                .Execute
                endPos = rng44.Start
            End With
            If startPos1 < endPos Then
                Set sectionRange = ActiveDocument.Range(startPos1, endPos)
                sectionRange.Delete
            End If
            Set rng44 = ActiveDocument.Range(ActiveDocument.Sections(1).Range.Start, _
                                             ActiveDocument.Sections(ActiveDocument.Sections.count - 1).Range.End)
        Loop
    End With
End If
' --- Cut off the AO3 "Actions" footer (bookmark/comments/etc.) at the END of
'     the document. Searching BACKWARD from the end finds the last occurrence. ---
Dim doc23 As Document
Set doc23 = ActiveDocument
Dim rng23 As Range
Set rng23 = doc23.Range
rng23.Start = doc23.Content.End    ' collapse to the very end
With rng23.Find
    .Text = "^13Actions^13"  ' ^13 = paragraph mark; so this means "Actions" alone on a line
    .MatchCase = True
    .MatchWholeWord = False
    .MatchWildcards = True
    .Wrap = wdFindStop
    .Format = False
    .Forward = False ' Search backwards
    .Execute
End With
If rng23.Find.found Then
    doc23.Range(Start:=rng23.Start, End:=doc23.Content.End).Delete   ' delete from there to end
End If
' --- Re-apply body paragraph formatting to every Normal-style paragraph ---
Dim oDoc7 As Document
Dim oPara As Paragraph
Set oDoc7 = ActiveDocument
For Each oPara In oDoc7.paragraphs
    If oPara.Range.style = wdStyleNormal Then
        With oPara.Range.ParagraphFormat
            .alignment = wdAlignParagraphJustify
            .OutlineLevel = wdOutlineLevelBodyText
            .LeftIndent = 0
            .RightIndent = 0
            .FirstLineIndent = InchesToPoints(0.2)
            .spaceAfter = 0
            .spaceBefore = 0
            .LineSpacingRule = wdLineSpaceExactly
            .LineSpacing = 12.6
            .WidowControl = True
        End With
    End If
Next oPara
 ' Delete the very first paragraph mark in the doc (removes a leftover blank line).
 Dim rng3 As Range
    Set rng3 = ActiveDocument.Content
    With rng3.Find
        .ClearFormatting
        .Text = "^p"
        .Forward = True
        .Execute
    End With
    If rng3.Find.found Then
        rng3.Delete wdCharacter, 1
    End If
' For each section, grab its first paragraph and make it Heading 1
' (only when there are multiple sections, i.e. chapters).
For Each sec In ActiveDocument.Sections
    Set rng4 = sec.Range
    If rng4.Text <> "" Then
        rng4.Collapse Direction:=wdCollapseStart ' Collapse = shrink to a point at the start
        rng4.MoveEnd wdParagraph, 1 ' Extend the range to include the first paragraph
        If ActiveDocument.Sections.count > 1 Then
            rng4.style = wdStyleHeading1
        End If
    End If
Next sec
' Different first page + odd/even footers in every section (book-style page numbers).
Dim sec45 As Section
For Each sec45 In ActiveDocument.Sections
    With sec45
        .PageSetup.OddAndEvenPagesHeaderFooter = True
        .PageSetup.DifferentFirstPageHeaderFooter = True
    End With
Next sec45
 ' --- Create the FRONT MATTER sections ---
 ' Insert 3 section breaks at the very top (HomeKey wdStory = Ctrl+Home),
 ' creating empty sections 1-3 before the story: [title] [blank] [title page].
 ' Then 2 more are added, making room for the info page later.
 Dim i2 As Integer
    Const numSectionBreaks As Integer = 3      ' Const = fixed value that can't change
    Selection.HomeKey Unit:=wdStory
    For i2 = 1 To numSectionBreaks
        Selection.InsertBreak Type:=wdSectionBreakNextPage
    Next i2
Const numSectionBreaks18 As Integer = 2
Selection.HomeKey Unit:=wdStory
Dim i18 As Integer
For i18 = 1 To numSectionBreaks18
    Selection.InsertBreak Type:=wdSectionBreakNextPage
Next i18
Selection.EndKey Unit:=wdStory      ' Ctrl+End: go back to the bottom
' SECTION 1: half-title page (big title only, vertically centered).
Dim doc87 As Document
Dim rng87 As Range
Dim title87 As String
Set doc87 = ActiveDocument
title87 = doc87.Variables("Title").value     ' read back the saved Title variable
Set rng87 = doc87.Sections(1).Range
rng87.Collapse Direction:=wdCollapseStart
rng87.InsertAfter title87
rng87.style = wdStyleHeading1
rng87.Font.Size = 30
ActiveDocument.Sections(1).PageSetup.VerticalAlignment = wdAlignVerticalCenter
 ' SECTION 2: an "Intentionally Blank" page. The text is made HIDDEN so it
 ' doesn't print, but the page exists (keeps left/right page parity for printing).
 Dim doc20 As Document
Dim rng20 As Range
Dim blankText As String
Set doc20 = ActiveDocument
blankText = "Intentionally Blank"
Set rng20 = doc20.Sections(2).Range
rng20.Collapse Direction:=wdCollapseStart
rng20.InsertAfter blankText
rng20.style = wdStyleNormal
rng20.ParagraphFormat.alignment = wdAlignParagraphCenter
rng20.Start = rng20.End - Len(blankText)
rng20.Font.Hidden = True
doc20.Sections(2).PageSetup.VerticalAlignment = wdAlignVerticalCenter
   ' --- More text cleanup. Note "--" becomes an em dash (^+). ---
   Selection.Find.ClearFormatting
    Selection.Find.Replacement.ClearFormatting
    ReplaceAllText Selection.Range, "^l", "^p", wdFindContinue
Selection.Find.ClearFormatting
    Selection.Find.Replacement.ClearFormatting
    ReplaceAllText Selection.Range, "--", "^+", wdFindContinue
' --- Normalize scene-break lines. Different authors write *, ~~~, ---, etc.
'     We collect those paragraphs, then replace them ALL with "***". ---
Dim para33 As Paragraph
Dim rng33 As Range
Dim str33 As String
Dim paraToChange As Collection
Set paraToChange = New Collection
For Each para33 In ActiveDocument.paragraphs
    str33 = Trim(Replace(para33.Range.Text, vbCr, ""))
    ' "Or" chains: matches if the line is any one of these known break symbols.
    ' ChrW(n) builds a Unicode character from its code number.
    If (str33 = "~" Or str33 = "~~~" Or str33 = "- - -" Or str33 = "---" Or str33 = ChrW(10038) Or str33 = ".::." Or str33 = ChrW(8212) Or str33 = "**" Or str33 = "****" Or str33 = "*****" Or str33 = "******" Or str33 = "*******" Or str33 = "---" Or str33 = "*" Or str33 = ".") And str33 <> "***" Then
        paraToChange.Add para33
    ' Or the line is made ONLY of dashes/em-dashes, or ONLY of asterisks.
    ElseIf Len(str33) > 0 And (Len(Replace(Replace(str33, ChrW(8212), ""), "-", "")) = 0 Or Len(Replace(str33, "*", "")) = 0) And str33 <> "***" Then
        paraToChange.Add para33
    End If
Next para33
' (Collecting first and changing after avoids breaking the loop by editing while looping.)
For Each para33 In paraToChange
    Set rng33 = para33.Range
    rng33.Text = vbCr & "***" & vbCr & vbCr
Next para33
    ' --- Big batch of find/replace cleanups using the ReplaceAllText helper ---
    Selection.Find.ClearFormatting
    Selection.Find.Replacement.ClearFormatting
    ReplaceAllText Selection.Range, "^p" & Chr(160) & "^p" & Chr(160) & "^p", "^p" & "***" & "^p", wdFindContinue   ' two nbsp-only lines -> scene break
    ReplaceAllText Selection.Range, "^p^p", "^p", wdFindContinue      ' collapse blank lines
    ReplaceAllText Selection.Range, "^p ^p", "^p", wdFindContinue
    ReplaceAllText Selection.Range, "  ", " ", wdFindContinue         ' double space -> single
    ReplaceAllText Selection.Range, "^+", "^+", wdFindContinue        ' (no-op as written)
    ReplaceAllText Selection.Range, "^+ ", "^+", wdFindContinue       ' no space after an em dash
    ReplaceAllText Selection.Range, "--", "^+", wdFindContinue
    ' The next few look like no-ops (same text both sides). They were probably
    ' meant to convert straight quotes to curly ones, but the curly characters
    ' got flattened when the code was pasted.
    ReplaceAllText Selection.Range, "...", "...", wdFindContinue
    ReplaceAllText Selection.Range, "....", "...", wdFindContinue
    ReplaceAllText Selection.Range, """", """", wdFindContinue        ' "" inside a string = one literal "
    ReplaceAllText Selection.Range, "'", "'", wdFindContinue
    ReplaceAllText Selection.Range, "* * *", "***", wdFindContinue
    ReplaceAllText Selection.Range, "***", "^p" & "***" & "^p", wdFindContinue    ' put *** on its own line
    ReplaceAllText Selection.Range, "^p" & "*" & "^p", "^p" & "***" & "^p", wdFindContinue
    ' --- Horizontal-line images (<hr>) also become "***" scene breaks ---
    Dim doc45 As Document
    Set doc45 = ActiveDocument
    Dim inShape As InlineShape
    ' Count DOWN so deleting items doesn't shift the ones still to visit.
    For i = doc45.InlineShapes.count To 1 Step -1
        Set inShape = doc45.InlineShapes(i)
        If inShape.Type = wdInlineShapeHorizontalLine Then
            Dim rng45 As Range
            Set rng45 = inShape.Range
            inShape.Delete
            rng45.Text = vbCrLf & "***" & vbCrLf
            rng45.ParagraphFormat.alignment = wdAlignParagraphCenter
        End If
    Next i
  ' Collapse runs of repeated "***" down to one.
  ReplaceAllText ActiveDocument.Content, "***^p^p^p***^p^p^p***^p^p^p***", "***"
  ReplaceAllText ActiveDocument.Content, "***^p^p^p***^p^p^p***", "***"
  ReplaceAllText ActiveDocument.Content, "***^p^p^p***", "***"
' --- In the LAST section, delete the "Series this work belongs to:" footer
'     (searching backwards from the end of that section). ---
Dim doc57 As Document
Dim secLast As Section
Dim rng57 As Range
Set doc57 = ActiveDocument
Set secLast = doc57.Sections(doc57.Sections.count) ' Get the last section
Set rng57 = secLast.Range ' Set the range as the last section only
With rng57.Find
    .Text = "^13Series this work belongs to:^13"
    .MatchCase = True
    .MatchWholeWord = False
    .MatchWildcards = True
    .Wrap = wdFindStop
    .Format = False
    .Forward = False ' Search backwards
    .Execute
End With
If rng57.Find.found Then
    Dim rngToDelete As Range
    Set rngToDelete = secLast.Range
    rngToDelete.Start = rng57.Start ' shrink the range so it starts at the found text
    rngToDelete.Delete              ' ...and delete to the end of the section
End If
' --- Remove trailing blank paragraphs at the end of the doc (loop BACKWARD,
'     stop at the first paragraph that has real text). ---
Dim doc22 As Document
Dim rng22 As Range
Dim pageCount As Integer
Set doc22 = ActiveDocument
Dim i22 As Long
For i22 = doc22.paragraphs.count To 1 Step -1
    If Trim(Replace(doc22.paragraphs(i22).Range.Text, vbCr, "")) = "" Then
        doc22.paragraphs(i22).Range.Delete
    Else
        Exit For
    End If
Next i22
' Count pages; if ODD, add a section break so the book ends on an even page
' (printers want an even page count).  Mod = remainder after division.
doc22.Repaginate
pageCount = doc22.Content.ComputeStatistics(wdStatisticPages)
If pageCount Mod 2 = 1 Then
    Set rng22 = doc22.Content
    rng22.Collapse Direction:=wdCollapseEnd
    rng22.InsertBreak Type:=wdSectionBreakNextPage
End If


' --- Repeat the scene-break/quote cleanup but only inside the last section ---
Dim oRng As Range
    Dim oSec As Section
    Set oSec = ActiveDocument.Sections(ActiveDocument.Sections.count)
    Set oRng = oSec.Range
    oRng.Select 'Select the last section
    oRng.Find.ClearFormatting
    oRng.Find.Replacement.ClearFormatting
    ReplaceAllText oRng, "^p" & Chr(160) & "^p" & Chr(160) & "^p", "^p" & "***" & "^p", wdFindStop
    ReplaceAllText oRng, "^p^p", "^p", wdFindStop
    ReplaceAllText oRng, "^p ^p", "^p", wdFindStop
    ReplaceAllText oRng, "  ", " ", wdFindStop
    ReplaceAllText oRng, "^+", "^+", wdFindStop
    ReplaceAllText oRng, "^+ ", "^+", wdFindStop
    ReplaceAllText oRng, "--", "^+", wdFindStop
    ReplaceAllText oRng, "...", "...", wdFindStop
    ReplaceAllText oRng, "....", "...", wdFindStop
    ReplaceAllText oRng, """", """", wdFindStop
    ReplaceAllText oRng, "'", "'", wdFindStop
    ReplaceAllText oRng, "* * *", "***", wdFindStop
    ReplaceAllText oRng, "***", "^p" & "***" & "^p", wdFindStop
    ReplaceAllText oRng, "^p" & "*" & "^p", "^p" & "***" & "^p", wdFindStop
' --- SECTION 4: the info page (publication year, fandom, rating, stats, blurb) ---
Dim doc80 As Document
Dim rng80 As Range
Dim info As String
Dim shp80 As InlineShape
Dim cc As contentControl
Set doc80 = ActiveDocument
' Build the whole page as one long string. "#&1", "#&2"... are placeholders
' that later become fill-in content controls (see below).
info = vbNewLine & vbNewLine & vbNewLine & _
   "#&1" & vbNewLine & vbNewLine & _
   "First published in " & Year1 & vbNewLine
If Year2 <> "" Then
   info = info & " Completed in " & Year2 & vbNewLine
End If
If SeriesPart <> "" Then
    info = info & vbNewLine & "Series:" & vbNewLine & SeriesPart & vbNewLine & vbNewLine
End If
info = info & "Based on " & Fandom & _
   "Relationships: " & Relationship & vbNewLine & _
   "Rating: " & Rating & vbNewLine & _
   "Words: " & WordCount & _
   "Hits: " & HitCount & _
   "Kudos: " & KudosCount & vbNewLine & vbNewLine & _
   "***" & vbNewLine & vbNewLine & _
   Blurb
doc80.Sections(3).Range.InsertBreak Type:=wdSectionBreakNextPage
Set rng80 = doc80.Sections(4).Range
rng80.Text = info
rng80.style = wdStyleSubtitle
doc80.Sections(4).PageSetup.VerticalAlignment = wdAlignVerticalCenter
  ' --- Turn each "#&1/#&2/#&3" placeholder into a Content Control: a fill-in
  '     box in Word with grey placeholder text ("URL", "Name, Year"). ---
  Dim oDoc37 As Document
    Dim oCC37 As contentControl
    Dim Rng37 As Range
    Dim RngColl As New Collection
    Dim i37 As Long
    Dim placeholderTexts() As Variant
    Set oDoc37 = ActiveDocument
    Set Rng37 = oDoc37.Sections(4).Range
    placeholderTexts = Array("URL", "Name, Year", "Name, Year")   ' Array() builds a quick list
    With Rng37.Find
        .Text = "#&[1-3]"           ' wildcard: "#&" followed by 1, 2 or 3
        .Forward = True
        .Wrap = wdFindStop
        .MatchWildcards = True
        While .Execute              ' While...Wend is an older style of loop
            RngColl.Add Rng37.Duplicate   ' save each match (can't edit while searching)
        Wend
    End With
    For i37 = 1 To RngColl.count
        Set Rng37 = RngColl(i37)
        Rng37.MoveEnd count:=-1  ' Exclude the paragraph mark after "#&"
        Rng37.End = Rng37.paragraphs.first.Range.End
        Set oCC37 = oDoc37.ContentControls.Add(wdContentControlText, Rng37)
        oCC37.Title = "Your Title Here"
        oCC37.SetPlaceholderText , , placeholderTexts(i37 - 1) ' arrays start at 0, loop starts at 1, hence -1
        oCC37.Range.Text = ""  ' Clear the initial text in the content control
    Next i37
' --- Pictures: convert inline images to floating shapes, centered, with text
'     wrapping above/below (so images sit on their own line). ---
Dim pic As InlineShape
Dim shp As Shape
For Each pic In ActiveDocument.InlineShapes '(5:40)
    If pic.Type = wdInlineShapePicture Or pic.Type = wdInlineShapeLinkedPicture Or _
       pic.Type = wdInlineShapePictureHorizontalLine Or pic.Type = wdInlineShapePictureBullet Or _
       pic.Type = wdInlineShapePictureNumber Or pic.Type = wdInlineShapeOleObject Or _
       pic.Type = wdInlineShapeLinkedOLEObject Or pic.Type = wdInlineShapeOLEControlObject Then
        On Error Resume Next ' Ignore errors (conversion can fail for some objects)
        Set shp = pic.ConvertToShape
        On Error GoTo 0 ' Stop ignoring errors
        If Not shp Is Nothing Then
            shp.WrapFormat.Type = wdWrapTopBottom
            shp.RelativeHorizontalPosition = wdRelativeHorizontalPositionMargin
            shp.Left = wdShapeCenter
            shp.Top = wdAlignVerticalTop
        End If
    End If
Next pic
    ' Center every "***" paragraph.
    Dim para56 As Paragraph
    For Each para56 In ActiveDocument.paragraphs
        If Trim(Replace(para56.Range.Text, vbCr, "")) = "***" Then
            para56.alignment = wdAlignParagraphCenter
        End If
    Next para56
' --- Delete AO3 boilerplate lines from the last section. ---
' "For Each searchText In Array(...)" loops over a list of phrases.
' Wildcards are turned on ONLY for the first one ("Translation into*",
' where * means "anything"), via the expression (searchText = "Translation into*").
Dim rng27 As Range
Dim doc27 As Document
Dim secLast27 As Section
Set doc27 = ActiveDocument
Set secLast27 = doc27.Sections(doc27.Sections.count)
Set rng27 = secLast27.Range
For Each searchText In Array("Translation into*", _
                            "(See the end of the work for other works inspired by this one.)", _
                            "(See the end of the work for notes and other works inspired by this one.)", _
                            "(See the end of the work for more notes and other works inspired by this one.)", _
                            "(See the end of the work for notes.)", _
                            "(See the end of the chapter for more notes.)", _
                            "(See the end of the chapter for notes.)")
    With rng27.Find
        .Text = searchText
        .Forward = True
        .Wrap = wdFindStop
        .Format = False
        .MatchCase = True
       .MatchWildcards = (searchText = "Translation into*") ' a True/False comparison used as a value
       .Execute
        Do While .found
            rng27.Select
            rng27.paragraphs(1).Range.Delete     ' delete the whole paragraph the text was in
            .Execute
        Loop
    End With
Next searchText
' --- Remove the first-line indent from paragraphs that follow a scene break
'     or a Notes/Summary label (typographic convention: no indent after a break). ---
Dim para43 As Paragraph
Dim sceneBreak As String
Dim noteOrSummary As String
Dim foundBreak As Boolean
Dim doc43 As Document
Dim sec43 As Section
Dim isFirstParagraph As Boolean
Dim isAfterSceneBreak As Boolean
sceneBreak = "***"
foundBreak = False
noteOrSummary = "Notes:|Summaries:"
Set doc43 = ActiveDocument '(6:34)
For Each para43 In ActiveDocument.paragraphs
    ' "Like" is VBA's pattern-matching operator: * means any characters.
    If para43.Range.Text = sceneBreak & vbCr Or para43.Range.Text Like "*Notes:*" Or para43.Range.Text Like "*Summaries:*" Or para43.Range.Text Like "*Summary:*" Then
        foundBreak = True
    ElseIf foundBreak And para43.Range.Text <> vbCr Then
        With para43.Range.ParagraphFormat
            .LeftIndent = CentimetersToPoints(0)
            .FirstLineIndent = CentimetersToPoints(0)
        End With
        foundBreak = False
    End If
Next para43
' --- Also un-indent the paragraph right after each section's first paragraph
'     (the first paragraph of a chapter, after the heading, has no indent). ---
For Each sec43 In doc43.Sections
    isFirstParagraph = True
    isAfterSceneBreak = False
    For Each para43 In sec43.Range.paragraphs
        If Not isFirstParagraph Then ' Skip the first paragraph
            If isAfterSceneBreak Then
                With para43.Range.ParagraphFormat
                    .LeftIndent = 0
                    .FirstLineIndent = 0
                End With
                isAfterSceneBreak = False
            Else
                With para43.Range.ParagraphFormat
                    .LeftIndent = 0
                    .FirstLineIndent = 0
                End With
            End If
            Exit For ' only the first body paragraph per section, then move to next section
        End If
        If InStr(para43.Range.Text, "***") > 0 Or InStr(para43.Range.Text, "Notes:") > 0 Or InStr(para43.Range.Text, "Summaries:") > 0 Then
            isAfterSceneBreak = True
        End If
        isFirstParagraph = False
    Next para43
Next sec43
' --- SECTION 3: title page. Title = Heading 2, Author = Heading 3. ---
Dim doc86 As Document
Dim rng86 As Range
Dim title86 As String
Dim author86 As String
Set doc86 = ActiveDocument
title86 = doc86.Variables("Title").value
author86 = doc86.Variables("Author").value
Set rng86 = doc86.Sections(3).Range
rng86.Collapse Direction:=wdCollapseStart
rng86.InsertAfter title86 & vbCr & author86
' Select exactly the title text by position (Start + length)...
rng86.Start = rng86.Start
rng86.End = rng86.Start + Len(title86)
rng86.style = wdStyleHeading2
' ...then the author text, which starts after the title + 1 paragraph mark.
Set rng86 = doc86.Sections(3).Range
rng86.Start = rng86.Start + Len(title86) + 1
rng86.End = rng86.Start + Len(author86)
rng86.style = wdStyleHeading3
' --- Footers: for sections after section 6 (the story), blank all footers
'     then add a page-number field: right-aligned on odd pages, left-aligned
'     on even pages (classic book layout). ---
Dim sec79 As Section
For Each sec79 In ActiveDocument.Sections
    sec79.PageSetup.OddAndEvenPagesHeaderFooter = True
    sec79.PageSetup.DifferentFirstPageHeaderFooter = True
    sec79.PageSetup.FooterDistance = InchesToPoints(0.4)
    UnlinkSectionFooters sec79      ' stop inheriting footers from the previous section
    sec79.Footers(wdHeaderFooterPrimary).Range.Text = ""
    sec79.Footers(wdHeaderFooterEvenPages).Range.Text = ""
    sec79.Footers(wdHeaderFooterFirstPage).Range.Text = ""
    If sec79.index > 6 Then
        With sec79.Footers(wdHeaderFooterPrimary).Range
            .Fields.Add Range:=.Characters.Last, Type:=wdFieldPage   ' a {PAGE} field
            .ParagraphFormat.alignment = wdAlignParagraphRight
            .Font.Name = "Sabon Next LT"
            .Font.Size = 9
        End With
        With sec79.Footers(wdHeaderFooterEvenPages).Range
            .Fields.Add Range:=.Characters.Last, Type:=wdFieldPage
            .ParagraphFormat.alignment = wdAlignParagraphLeft
            .Font.Name = "Sabon Next LT"
            .Font.Size = 9
        End With
    End If
Next sec79
' --- Last section: restyle "Chapter N: ..." lines as Heading 4 (the notes
'     section's chapter headings). Same detection logic as the first pass. ---
Dim doc28 As Document
Dim sec28 As Section
Dim rng28 As Range
Dim para28 As Paragraph
Dim splitText28() As String
Dim chapterPart28 As String
Dim splitChapterPart28() As String
Dim lastChapterNumber28 As String
Set doc28 = ActiveDocument
Set sec28 = doc28.Sections(doc28.Sections.count) ' Last section
Set rng28 = sec28.Range
For Each para28 In rng28.paragraphs
    splitText28 = Split(para28.Range.Text, ":")
    If UBound(splitText28) >= 0 Then
        chapterPart28 = Trim$(splitText28(0))
        If InStr(chapterPart28, " ") > 0 Then
            splitChapterPart28 = Split(chapterPart28, " ")
            If UBound(splitChapterPart28) >= 1 And splitChapterPart28(0) = "Chapter" And IsNumeric(splitChapterPart28(1)) Then
                If splitChapterPart28(1) <> lastChapterNumber28 Then
                    para28.Range.Font.Reset
                    para28.Range.ParagraphFormat.Reset
                    para28.Range.style = ActiveDocument.Styles(wdStyleHeading4)
                    lastChapterNumber28 = splitChapterPart28(1)
                End If
            End If
        End If
    End If
Next para28
 ' --- In the last section, after a "Chapter Text" line, rename "Notes:" to
 '     "End Notes:" so end-notes can be told apart from start-notes. ---
 Dim doc60 As Document
    Dim para60 As Paragraph
    Dim lastSection60 As Section
    Dim rng60 As Range
    Dim inChapterText60 As Boolean      ' a "flag" variable: remembers a state between loop passes
    Set doc60 = ActiveDocument
    Set lastSection60 = doc60.Sections(doc60.Sections.count)
    Set rng60 = lastSection60.Range
    inChapterText60 = False
    For Each para60 In rng60.paragraphs
        If InStr(para60.Range.Text, "Chapter Text") > 0 Then
            inChapterText60 = True
        ElseIf InStr(para60.Range.Text, "Chapter ") = 1 Then   ' =1 means "starts with"
            inChapterText60 = False
        End If
        If inChapterText60 And InStr(para60.Range.Text, "Notes:") = 1 Then
            para60.Range.Text = Replace(para60.Range.Text, "Notes:", "End Notes:")
        End If
    Next
    ' --- Delete leftover AO3 marker paragraphs from the last section.
    '     Loops BACKWARD so deleting doesn't skip items. ---
    Dim lastSection30 As Section
    Dim lastParagraph30 As Paragraph
    Dim i30 As Integer
    Set lastSection30 = ActiveDocument.Sections.Last '(10:20)
    For i30 = lastSection30.Range.paragraphs.count To 1 Step -1
       Set lastParagraph30 = lastSection30.Range.paragraphs(i30)
       If InStr(lastParagraph30.Range.Text, "Chapter Text") > 0 Or _
        InStr(lastParagraph30.Range.Text, "Chapter by Chapter") > 0 Or _
        InStr(lastParagraph30.Range.Text, "(See the end of the chapter for notes.)") > 0 Or _
        InStr(lastParagraph30.Range.Text, "(See the end of the work for more notes.)") > 0 Or _
        InStr(lastParagraph30.Range.Text, "Chapters:") > 0 Or _
            InStr(lastParagraph30.Range.Text, "(See the end of the chapter for more notes.)") > 0 Then
            lastParagraph30.Range.Delete
        End If
    Next i30
' --- Style "End Notes:", "Summary:", "Notes:" labels as Heading 5.
'     The Find pattern "<phrase>*^13" means: the phrase, then anything,
'     then a paragraph mark -- i.e. the whole line. ---
Dim rng39 As Range
Dim phrases39 As Variant
Dim phrase39 As Variant
Dim sec39 As Section
Set sec39 = ActiveDocument.Sections(ActiveDocument.Sections.count)
phrases39 = Array("End Notes:", "Summary:", "Notes:")
For Each phrase39 In phrases39
    Set rng39 = sec39.Range
    With rng39.Find
        .Text = phrase39 & "*^13"
        .Forward = True
        .Wrap = wdFindStop
        .Format = False
        .MatchWholeWord = False
        .MatchWildcards = True
        .Execute
        Do While .found
            rng39.paragraphs(1).Range.style = ActiveDocument.Styles(wdStyleHeading5)
            rng39.Collapse Direction:=wdCollapseEnd    ' move past this match so the next Execute finds the NEXT one
            .Execute
        Loop
    End With
Next



' --- EMPTY-NOTES CLEANUP (the most complex loop in the macro) ---
' Goal: for each "Chapter N" heading in the last section, check whether it has
' a "Notes:" label that actually has text under it. If there are no notes at
' all, delete the chapter heading; if there's a "Notes:" label with nothing
' beneath it, delete both the label and the heading.
' Loops BACKWARD (i31 counts down) because it deletes paragraphs as it goes.
Dim doc31 As Document
Dim sec31 As Section
Dim rng31 As Range
Dim para31 As Paragraph
Dim paraCheck31 As Paragraph
Dim i31 As Long
Dim j31 As Long
Dim k31 As Long
Dim notesPara31 As Long
Dim text31 As String
Dim checkText31 As String
Dim noteText31 As String
Dim foundNotes31 As Boolean
Dim hasActualNotes31 As Boolean
Set doc31 = ActiveDocument
Set sec31 = doc31.Sections(doc31.Sections.count)
Set rng31 = sec31.Range
For i31 = rng31.paragraphs.count To 1 Step -1
    Set para31 = rng31.paragraphs(i31)
    text31 = para31.Range.Text
    text31 = Replace(text31, vbCr, "")
    text31 = Replace(text31, Chr(7), "")      ' Chr(7) = end-of-cell marker in tables
    text31 = Trim(text31)
    Do While Left(text31, 1) = "#"            ' strip Markdown "#" heading symbols
        text31 = Trim(Mid(text31, 2))         ' Mid(text, 2) = everything from char 2 onward
    Loop
    If LCase(Left(text31, 8)) = "chapter " Then      ' LCase = lowercase, for case-insensitive compare
        foundNotes31 = False
        hasActualNotes31 = False
        notesPara31 = 0
        ' Scan the paragraphs AFTER this heading (j31 loop) for a "Notes:" label.
        For j31 = i31 + 1 To rng31.paragraphs.count
            Set paraCheck31 = rng31.paragraphs(j31)
            checkText31 = paraCheck31.Range.Text
            checkText31 = Replace(checkText31, vbCr, "")
            checkText31 = Replace(checkText31, Chr(7), "")
            checkText31 = Trim(checkText31)
            If Len(checkText31) = 0 Then
                GoTo ContinueChapterScan31       ' skip blank lines (like "Continue" in other languages)
            End If
            Do While Left(checkText31, 1) = "#"
                checkText31 = Trim(Mid(checkText31, 2))
            Loop
            If LCase(Left(checkText31, 8)) = "chapter " Then
                Exit For                          ' reached the next chapter: stop
            End If
            If LCase(Left(checkText31, 10)) = "end notes:" Then
                Exit For
            End If
            If LCase(Left(checkText31, 6)) = "notes:" Then
                foundNotes31 = True
                notesPara31 = j31
                ' Now look at what follows the label: is there real text?
                For k31 = j31 + 1 To rng31.paragraphs.count
                    Set paraCheck31 = rng31.paragraphs(k31)
                    noteText31 = paraCheck31.Range.Text
                    noteText31 = Replace(noteText31, vbCr, "")
                    noteText31 = Replace(noteText31, Chr(7), "")
                    noteText31 = Trim(noteText31)
                    If Len(noteText31) = 0 Then
                        GoTo ContinueNoteScan31
                    End If
                    Do While Left(noteText31, 1) = "#"
                        noteText31 = Trim(Mid(noteText31, 2))
                    Loop
                    If LCase(Left(noteText31, 8)) = "chapter " _
                       Or LCase(Left(noteText31, 10)) = "end notes:" Then
                        hasActualNotes31 = False      ' next thing is another chapter => label was empty
                        Exit For
                    End If
                    hasActualNotes31 = True           ' found real text under the label
                    Exit For
ContinueNoteScan31:       ' <- this is a GoTo label (name followed by a colon)
                Next k31
                Exit For
            End If
ContinueChapterScan31:
        Next j31
        If foundNotes31 = False Then
            para31.Range.Delete                        ' no Notes label: remove the chapter heading
        ElseIf hasActualNotes31 = False Then
            rng31.paragraphs(notesPara31).Range.Delete ' empty Notes label: remove it...
            para31.Range.Delete                        ' ...and the heading
        End If
    End If
Next i31
' --- Last section footer: lowercase roman numerals (i, ii, iii), restarting at 1,
'     centered. A "section" footer is its own object you can configure. ---
Dim doc46 As Document
    Dim sec46 As Section
    Dim foot46 As HeaderFooter
    Set doc46 = ActiveDocument
    Set sec46 = doc46.Sections(doc46.Sections.count)
    For Each foot46 In sec46.Footers
        If foot46.Exists Then
            foot46.LinkToPrevious = False          ' don't copy the previous section's footer
            foot46.Range.Text = ""
            sec46.Footers(wdHeaderFooterPrimary).PageNumbers.NumberStyle = wdPageNumberStyleLowercaseRoman
            sec46.Footers(wdHeaderFooterPrimary).PageNumbers.StartingNumber = 1
            sec46.Footers(wdHeaderFooterPrimary).PageNumbers.RestartNumberingAtSection = True
            foot46.Range.Fields.Add Range:=foot46.Range, Type:=wdFieldPage
            foot46.Range.ParagraphFormat.alignment = wdAlignParagraphCenter
        End If
    Next foot46
    sec46.PageSetup.FooterDistance = Application.CentimetersToPoints(1.02)
 ' --- Second-to-last section (the blank page before the notes): empty footers ---
 Dim doc47 As Document
    Dim sec47 As Section
    Dim foot47 As HeaderFooter
    Set doc47 = ActiveDocument
    Set sec47 = doc47.Sections(doc47.Sections.count - 1)
    For Each foot47 In sec47.Footers
        If foot47.Exists Then
            foot47.LinkToPrevious = False
            foot47.Range.Text = ""
        End If
    Next foot47
    sec47.PageSetup.FooterDistance = Application.CentimetersToPoints(1.02)
' --- Remove an empty "Completed in " line from the info page (when the work
'     isn't complete, Year2 is blank, leaving a dangling label). ---
Dim rng53 As Range
    Dim strSearch53 As String
    strSearch53 = "Completed in " ' Add a space after "in"
    Set rng53 = ActiveDocument.Sections(4).Range
    rng53.Find.ClearFormatting
    ReplaceAllText rng53, strSearch53 & "^13", "", wdFindContinue
' --- Cut the AO3 "Series this work belongs to:" and "Works inspired by this
'     one:" footers (everything from there to the end of the document). ---
Dim doc59 As Document
Set doc59 = ActiveDocument
Dim rng59 As Range
Set rng59 = doc59.Range
rng59.Start = doc59.Content.End
With rng59.Find
    .Text = "^13Series this work belongs to:^13"
    .MatchCase = True
    .MatchWholeWord = False
    .MatchWildcards = True
    .Wrap = wdFindStop
    .Format = False
    .Forward = False
    .Execute
End With
If rng59.Find.found Then
    doc59.Range(Start:=rng59.Start, End:=doc59.Content.End).Delete
End If
Set rng59 = doc59.Range ' Reset the range
rng59.Start = doc59.Content.End ' Move the start of the range to the end of the document
With rng59.Find
    .Text = "^13Works inspired by this one:^13"
    .MatchCase = True
    .MatchWholeWord = False
    .MatchWildcards = True
    .Wrap = wdFindStop
    .Format = False
    .Forward = False
    .Execute
End With
If rng59.Find.found Then
    doc59.Range(Start:=rng59.Start, End:=doc59.Content.End).Delete
End If
' --- Unlink headers/footers for the front matter (sections 1-7) and the
'     last two sections, so each can be customized independently. ---
Dim sec886 As Section
Dim secIndex886 As Integer
For Each sec886 In ActiveDocument.Sections
    secIndex886 = sec886.index
    If secIndex886 <= 7 Then
        UnlinkSectionHeadersAndFooters sec886
    ElseIf secIndex886 >= (ActiveDocument.Sections.count - 1) Then
        UnlinkSectionHeadersAndFooters sec886
    End If
Next sec886
' --- FINAL pass: force all Normal-style paragraphs to the standard look again
'     (in case any earlier step altered their font/paragraph settings). ---
Dim paraFinal As Paragraph
For Each paraFinal In ActiveDocument.paragraphs
    If paraFinal.Range.style = wdStyleNormal Then
        With paraFinal.Range.Font
            .Name = "Sabon Next LT"
            .Size = 10.5
            .Bold = False
            .Italic = False
            .Underline = wdUnderlineNone
            .Color = wdColorBlack
        End With
        With paraFinal.Range.ParagraphFormat
            .alignment = wdAlignParagraphJustify
            .LeftIndent = 0
            .RightIndent = 0
            .FirstLineIndent = InchesToPoints(0.2)
            .spaceBefore = 0
            .spaceAfter = 0
            .LineSpacingRule = wdLineSpaceExactly
            .LineSpacing = 12.6
            .WidowControl = True
        End With
    End If
Next paraFinal
' --- FINAL pass 2: no indent on the first paragraph after each "***" break. ---
Dim secFinal As Section
Dim pFinal As Paragraph
Dim seenBreakFinal As Boolean
For Each secFinal In ActiveDocument.Sections
    seenBreakFinal = False
    For Each pFinal In secFinal.Range.paragraphs
        If Trim(Replace(pFinal.Range.Text, vbCr, "")) = "***" Then
            seenBreakFinal = True
        ElseIf seenBreakFinal And Trim(Replace(pFinal.Range.Text, vbCr, "")) <> "" Then
            pFinal.Range.ParagraphFormat.FirstLineIndent = 0
            pFinal.Range.ParagraphFormat.LeftIndent = 0
            seenBreakFinal = False
        End If
    Next pFinal
Next secFinal


 '========================================================
' FINAL AUTHOR'S NOTES + CHAPTER NOTES
'========================================================
' Author's Notes and the per-chapter notes are intentionally kept in ONE
' section.  There is no separate Appendix section.

Dim notesSection22 As Section
Dim chapterIndex95 As Long
Dim chapterText95 As String
Dim rngAuthor22 As Range
Dim rngChapterNotes22 As Range
Dim chapterNoteStart22 As Long
Dim chapterNoteEnd22 As Long
Dim paraFormat22 As Paragraph
Dim docFinal22 As Document

Set docFinal22 = ActiveDocument

'--------------------------------------------------------
' AUTHOR'S NOTES
'--------------------------------------------------------
' Add a new section at the very end, then write a title + subtitle into it.
Set rngAuthor22 = docFinal22.Content
rngAuthor22.Collapse Direction:=wdCollapseEnd
rngAuthor22.InsertBreak Type:=wdSectionBreakNextPage

Set notesSection22 = docFinal22.Sections(docFinal22.Sections.count)

Set rngAuthor22 = notesSection22.Range
rngAuthor22.Collapse Direction:=wdCollapseStart
rngAuthor22.InsertAfter _
    "Author's Notes" & vbCr & _
    "A collection of Notes and Summaries from the original published works on archiveofourown.org" & _
    vbCr & vbCr

' Find the "Author's Notes" text we just inserted and make it Heading 1.
' (`If .Execute Then ...` runs the search AND checks whether it found something.)
Set rngAuthor22 = notesSection22.Range
With rngAuthor22.Find
    .ClearFormatting
    .Text = "Author's Notes"
    .Forward = True
    .Wrap = wdFindStop
    .Format = False
    .MatchCase = False
    .MatchWholeWord = True
    If .Execute Then rngAuthor22.style = wdStyleHeading1
End With

' Overall fic Summary/Notes.
If Len(savedText24) > 0 Then
    Set rngAuthor22 = notesSection22.Range
    rngAuthor22.Collapse Direction:=wdCollapseEnd
    rngAuthor22.InsertAfter savedText24
    rngAuthor22.Collapse Direction:=wdCollapseEnd
End If

'--------------------------------------------------------
' CHAPTER NOTES -- directly after Author's Notes
'--------------------------------------------------------
' There is deliberately NO section break and NO "Appendix" heading here.
' Chapter headings are formatted as Heading 4 and each Notes: label
' is bolded so the collected notes read like a proper notes section.
Set rngAuthor22 = notesSection22.Range
rngAuthor22.Collapse Direction:=wdCollapseEnd
chapterNoteStart22 = rngAuthor22.Start

' Paste in every chapter's saved text (collected at the very beginning).
' Collections are 1-based: first item is item(1).
For chapterIndex95 = 1 To chapterCollection96.count
    chapterText95 = chapterCollection96.item(chapterIndex95)
    rngAuthor22.InsertAfter chapterText95
    rngAuthor22.Collapse Direction:=wdCollapseEnd
Next chapterIndex95

chapterNoteEnd22 = rngAuthor22.Start

' Format what we just inserted: chapter lines -> Heading 4; "Notes:" and
' "Summary:" labels -> bold, no indent, small spacing.
If chapterNoteEnd22 > chapterNoteStart22 Then
    Set rngChapterNotes22 = docFinal22.Range(chapterNoteStart22, chapterNoteEnd22)

    For Each paraFormat22 In rngChapterNotes22.paragraphs
        Dim formatText22 As String
        formatText22 = CleanAppendixParagraph(paraFormat22.Range.Text)

        If IsAppendixChapterHeading(formatText22) Then
            paraFormat22.style = docFinal22.Styles(wdStyleHeading4)
            paraFormat22.Range.ParagraphFormat.keepWithNext = True
            paraFormat22.Range.ParagraphFormat.FirstLineIndent = 0
            paraFormat22.Range.ParagraphFormat.LeftIndent = 0
        ElseIf LCase$(formatText22) = "notes:" Or LCase$(formatText22) = "summary:" Then
            paraFormat22.Range.Font.Bold = True
            paraFormat22.Range.ParagraphFormat.FirstLineIndent = 0
            paraFormat22.Range.ParagraphFormat.LeftIndent = 0
            paraFormat22.Range.ParagraphFormat.spaceBefore = 6
            paraFormat22.Range.ParagraphFormat.spaceAfter = 3
        End If
    Next paraFormat22
End If

' Redraw the screen again and tell the user we're done.
Application.ScreenUpdating = True
MsgBox "Macro ran successfully", vbInformation
End Sub

'========================================================
' NEW-FORMAT HEADER HELPERS
'========================================================

' CleanParaText: returns a paragraph's text with paragraph marks and odd whitespace
Private Function CleanParaText(ByVal value As String) As String
    Dim result As String
    result = value
    result = Replace(result, vbCr, "")
    result = Replace(result, vbLf, "")
    result = Replace(result, Chr(7), "")
    result = Replace(result, Chr(11), " ")
    result = Replace(result, Chr(160), " ")
    CleanParaText = Trim$(result)
End Function

' StripAllWhitespace: removes EVERY kind of space/tab/line-ending from text.
' (Defined but not currently called by the main macro.)
Private Function StripAllWhitespace(ByVal value As String) As String
    Dim result As String
    result = value
    result = Replace(result, " ", "")
    result = Replace(result, vbCr, "")
    result = Replace(result, vbLf, "")
    result = Replace(result, vbTab, "")
    result = Replace(result, Chr(7), "")
    result = Replace(result, Chr(11), "")
    result = Replace(result, Chr(160), "")
    StripAllWhitespace = result
End Function

' FindSeparatorIndex: returns the paragraph NUMBER of the "----------" line
' that ends the header (0 if none found)
Private Function FindSeparatorIndex(ByVal doc As Document) As Long
    Dim p As Paragraph
    Dim idx As Long
    Dim t As String
    For Each p In doc.paragraphs
        idx = idx + 1
        If idx > 200 Then Exit For
        t = CleanParaText(p.Range.Text)
        If Len(t) >= 5 Then
            If Len(Replace(t, "-", "")) = 0 Then
                FindSeparatorIndex = idx
                Exit Function
            End If
        End If
    Next p
End Function

' GetHeaderValue: finds the line that starts "<key>:" among the first
' lastPara paragraphs and returns what follows the colon.
' e.g. line "Words: 12,345" with key "Words" -> "12,345".
' Left$(t, Len(key)+1) takes the first (key length + 1) characters, to compare
' against "key:". Mid$(t, n) returns everything from character n onward.
Private Function GetHeaderValue(ByVal doc As Document, ByVal key As String, ByVal lastPara As Long) As String
    Dim p As Paragraph
    Dim idx As Long
    Dim t As String
    For Each p In doc.paragraphs
        idx = idx + 1
        If idx > lastPara Then Exit For
        t = CleanParaText(p.Range.Text)
        If LCase$(Left$(t, Len(key) + 1)) = LCase$(key) & ":" Then
            GetHeaderValue = Trim$(Mid$(t, Len(key) + 2))
            Exit Function
        End If
    Next p
End Function

' IsWorkComplete: given "19/25" (chapters posted / total) returns True only if
' both numbers match AND the total is more than 1.
Private Function IsWorkComplete(ByVal chapStr As String) As Boolean
    Dim parts() As String
    chapStr = Trim$(chapStr)
    If InStr(chapStr, "/") = 0 Then Exit Function
    parts = Split(chapStr, "/")
    If UBound(parts) < 1 Then Exit Function
    If Not IsNumeric(Trim$(parts(0))) Then Exit Function
    If Not IsNumeric(Trim$(parts(1))) Then Exit Function
    If CLng(Trim$(parts(0))) = CLng(Trim$(parts(1))) And CLng(Trim$(parts(1))) > 1 Then
        IsWorkComplete = True
    End If
End Function

' FormatSeries: turns "Part 2 of Some Series" into "Some Series, Part 2".
' Anything that doesn't match that shape is returned unchanged.
' InStr(start, text, find, compareMode) with vbTextCompare = case-insensitive.
Private Function FormatSeries(ByVal raw As String) As String
    Dim partPos As Long
    Dim ofPos As Long
    raw = Trim$(raw)
    If raw = "" Then Exit Function
    partPos = InStr(1, raw, "Part ", vbTextCompare)
    If partPos > 0 Then ofPos = InStr(partPos + 5, raw, " of ", vbTextCompare)
    If partPos > 0 And ofPos > 0 Then
        ' Mid$ with 3 args = (text, start, length): pulls the number between "Part " and " of "
        FormatSeries = Trim$(Mid$(raw, ofPos + 4)) & ", Part " & Trim$(Mid$(raw, partPos + 5, ofPos - (partPos + 5)))
    Else
        FormatSeries = raw
    End If
End Function

' Index of the real "Chapter N..." heading that starts the story:
' the last chapter-looking paragraph before the first "Chapter Text" line.
' (Why "last"? The header summary can list chapter-looking lines too; the
' real chapter heading is the one right before the "Chapter Text" marker.)
' "pending" remembers the most recent chapter heading seen; "firstAny" is a
' fallback if no "Chapter Text" marker exists at all.
Private Function FindFirstChapterIndex(ByVal doc As Document, ByVal sepIdx As Long) As Long
    Dim p As Paragraph
    Dim idx As Long
    Dim t As String
    Dim pending As Long
    Dim firstAny As Long
    For Each p In doc.paragraphs
        idx = idx + 1
        If idx > sepIdx Then
            t = CleanParaText(p.Range.Text)
            If LCase$(t) = "chapter text" Then
                If pending > 0 Then
                    FindFirstChapterIndex = pending
                    Exit Function
                End If
            ElseIf IsChapterHeading(t) Then
                pending = idx
                If firstAny = 0 Then firstAny = idx
            End If
        End If
    Next p
    FindFirstChapterIndex = firstAny
End Function

' NormAlnum: "normalize alphanumeric". Keeps only letters/digits, lowercased,
' so two pieces of text can be compared even if quotes, dashes or spacing differ.
' (Summaries show up twice in the export, formatted slightly differently.)
' AscW gives a character's Unicode number; those number ranges are
' 48-57 = 0-9, 65-90 = A-Z, 97-122 = a-z, plus accented/other-language chars.
' (Negative AscW values happen for high Unicode; +65536 fixes the sign.)
Private Function NormAlnum(ByVal value As String) As String
    Dim i As Long
    Dim c As Long
    Dim sb As String
    For i = 1 To Len(value)
        c = AscW(Mid$(value, i, 1))
        If c < 0 Then c = c + 65536
        If (c >= 48 And c <= 57) Or (c >= 65 And c <= 90) Or (c >= 97 And c <= 122) _
           Or (c >= 192 And c < 8192) Or c >= 12288 Then
            sb = sb & Mid$(value, i, 1)
        End If
    Next i
    NormAlnum = LCase$(sb)
End Function

' FindStoryStartIndex: for single-chapter works (no "Chapter N" heading),
' finds which paragraph the story starts at. It "walks" past the summary:
' as long as each paragraph matches the next chunk of the header's summary
' (compared with NormAlnum) it's still the summary. The first paragraph that
' doesn't match is the story. Returns 0 if it can't tell.
' (Defined but not currently called by the main macro.)
Private Function FindStoryStartIndex(ByVal doc As Document, ByVal sepIdx As Long, ByVal hdrSummary As String) As Long
    Dim p As Paragraph
    Dim idx As Long
    Dim t As String
    Dim n As String
    Dim acc As String          ' "accumulator": the summary text matched so far
    Dim normSum As String
    Dim inSummary As Boolean
    Dim fallbackIdx As Long

    normSum = NormAlnum(hdrSummary)
    inSummary = (Len(normSum) > 0)

    For Each p In doc.paragraphs
        idx = idx + 1
        If idx > sepIdx + 80 Then Exit For      ' don't look further than 80 paragraphs past the separator
        If idx > sepIdx Then
            t = CleanParaText(p.Range.Text)
            If Len(t) > 0 Then
                If IsAO3NotesPlaceholder(t) Then
                    FindStoryStartIndex = idx + 1    ' story starts after the "(See the end...)" line
                    Exit Function
                End If
                If inSummary Then
                    n = NormAlnum(t)
                    ' Does this paragraph continue the summary exactly where we left off?
                    If Len(acc) + Len(n) <= Len(normSum) And Mid$(normSum, Len(acc) + 1, Len(n)) = n Then
                        acc = acc & n
                    Else
                        inSummary = False
                        If fallbackIdx = 0 Then fallbackIdx = idx
                    End If
                ElseIf fallbackIdx = 0 Then
                    fallbackIdx = idx
                End If
            End If
        End If
    Next p
    FindStoryStartIndex = fallbackIdx
End Function

' SplitSummaryAndNotes: splits the paragraphs between the separator and the
' story into (1) the summary (paragraphs that match the header's Summary text
' in order) and (2) author's notes (everything after the summary ends).
' IMPORTANT: sumText and notesText are ByRef, so the CALLER's variables are
' filled in. A Sub can't return a value, so ByRef is how it hands back results.
' The "acc" trick is the same as in FindStoryStartIndex.
Private Sub SplitSummaryAndNotes(ByVal doc As Document, ByVal sepIdx As Long, ByVal storyIdx As Long, _
                                 ByVal hdrSummary As String, ByRef sumText As String, ByRef notesText As String)
    Dim p As Paragraph
    Dim idx As Long
    Dim t As String
    Dim n As String
    Dim acc As String
    Dim normSum As String
    Dim inSummary As Boolean
    Dim lastIdx As Long

    sumText = ""
    notesText = ""
    normSum = NormAlnum(hdrSummary)
    inSummary = (Len(normSum) > 0)
    If storyIdx > 0 Then lastIdx = storyIdx - 1 Else lastIdx = 0
    If lastIdx <= sepIdx Then Exit Sub      ' nothing between separator and story

    For Each p In doc.paragraphs
        idx = idx + 1
        If idx > lastIdx Then Exit For
        If idx > sepIdx Then
            t = CleanParaText(p.Range.Text)
            If Len(t) > 0 And Not IsAO3NotesPlaceholder(t) Then
                If inSummary Then
                    n = NormAlnum(t)
                    If Len(acc) + Len(n) <= Len(normSum) And Mid$(normSum, Len(acc) + 1, Len(n)) = n Then
                        acc = acc & n
                        sumText = sumText & t & vbCr
                    Else
                        inSummary = False     ' summary is over; this paragraph is a note
                    End If
                End If
                If Not inSummary Then notesText = notesText & t & vbCr
            End If
        End If
    Next p
End Sub

'========================================================
' CHAPTER END-NOTES COLLECTION (unchanged)
'========================================================

' CleanAppendixParagraph: cleans one paragraph of text for notes processing.
' Strips paragraph marks, nbsp, leading ">" (Markdown quote), leading "#"
' (Markdown heading), and repeated spaces.
Private Function CleanAppendixParagraph(ByVal value As String) As String
    Dim result As String

    result = value

    ' Remove Word paragraph/end-of-cell characters.
    result = Replace(result, vbCr, "")
    result = Replace(result, Chr(7), "")
    result = Replace(result, vbLf, "")

    ' Normalize non-breaking spaces from pasted Markdown/HTML.
    result = Replace(result, Chr(160), " ")

    ' Remove Markdown blockquote markers used in AO3 notes.
    result = Trim$(result)
    Do While Len(result) > 0 And Left$(result, 1) = ">"
        result = Trim$(Mid$(result, 2))
    Loop

    ' Remove Markdown heading markers, e.g. ### Notes:
    Do While Len(result) > 0 And Left$(result, 1) = "#"
        result = Trim$(Mid$(result, 2))
    Loop

    ' Collapse repeated spaces.
    result = CollapseSpaces(result)

    CleanAppendixParagraph = Trim$(result)
End Function

' BuildAppendixCollection: the heart of the notes feature. Reads the whole
' document top to bottom like a STATE MACHINE: flags (inSummary, inNotes,
' inWorkNotes) remember "what kind of text am I currently reading?" and each
' paragraph is handled according to the current state.
' For every chapter it gathers the summary + notes, and returns them as a
' Collection of strings (one string per chapter that has any notes).
' "Dim result As New Collection" creates the collection right away.
Private Function BuildAppendixCollection(ByVal doc As Document) As Collection
    Dim result As New Collection
    Dim i As Long
    Dim p As Paragraph
    Dim txt As String
    Dim currentHeader As String
    Dim currentSummary As String
    Dim currentNotes As String
    Dim inSummary As Boolean
    Dim inNotes As Boolean
    Dim workNotes As String
    Dim inWorkNotes As Boolean

    For i = 1 To doc.paragraphs.count
        Set p = doc.paragraphs(i)
        txt = CleanAppendixParagraph(p.Range.Text)

        If IsAppendixChapterHeading(txt) Then
            ' A new chapter starts: first save the previous chapter (if any)...
            If currentHeader <> "" Then
                AddChapterEntry result, currentHeader, currentSummary, currentNotes, False
            End If

            ' ...then reset all the state for the new chapter.
            ' Normalize Markdown/AO3 chapter links to plain chapter titles.
            currentHeader = NormalizeAppendixChapterHeading(txt)
            currentSummary = ""
            currentNotes = ""
            inSummary = False
            inNotes = False

        ElseIf currentHeader <> "" Then

            ' "Summary:" and "Notes:" normally sit between the chapter heading and
            ' "Chapter Text"; "Notes:" can also come after the chapter text.
            ' AO3's automatic "(See the end of...)" placeholders are ignored.
            If LCase$(txt) = "summary:" Then
                inSummary = True
                inNotes = False
                If Len(currentSummary) = 0 Then
                    currentSummary = "Summary:" & vbCr
                End If

            ElseIf LCase$(txt) = "notes:" Then
                inSummary = False
                inNotes = True
                If Len(currentNotes) = 0 Then
                    currentNotes = "Notes:" & vbCr
                End If

            ElseIf LCase$(txt) = "chapter text" Then
                inSummary = False
                inNotes = False

            ElseIf inSummary Or inNotes Then
                ' AO3 appends work-page navigation and metadata after the
                ' chapter's end notes. Stop collecting at the first such marker.
                If IsAO3NotesEndMarker(txt) Then
                    inSummary = False
                    inNotes = False
                ElseIf Not IsAO3NotesPlaceholder(txt) Then
                    If inSummary Then
                        If Len(txt) > 0 Then currentSummary = currentSummary & txt & vbCr
                    Else
                        currentNotes = currentNotes & txt & vbCr
                    End If
                End If
            End If

        Else
            ' single-chapter works, get end notes "Notes:".
            ' (No chapter heading has been seen yet, so currentHeader is empty.)
            If LCase$(txt) = "notes:" Then
                inWorkNotes = True
                workNotes = "Notes:" & vbCr
            ElseIf inWorkNotes Then
                If IsAO3NotesEndMarker(txt) Then
                    inWorkNotes = False
                ElseIf Len(txt) > 0 And Not IsAO3NotesPlaceholder(txt) Then
                    workNotes = workNotes & txt & vbCr
                End If
            End If
        End If
    Next i

    ' Always check the final chapter too (the loop only saves a chapter when
    ' it sees the NEXT heading, so the last one needs saving after the loop).
    If currentHeader <> "" Then
        AddChapterEntry result, currentHeader, currentSummary, currentNotes, True
    End If

    ' Work-level end notes of a single-chapter work.
    If HasAppendixNotes(workNotes) Then
        result.Add workNotes & vbCr
    End If

    Set BuildAppendixCollection = result     ' objects are returned with Set
End Function

' AddChapterEntry: adds one chapter's header + summary + notes to the
' collection, but only if it actually has a summary or notes.
' The Collection is passed ByVal, but ByVal on an OBJECT still lets you
' modify the object's contents (you copy the reference, not the object).
Private Sub AddChapterEntry(ByVal result As Collection, ByVal header As String, _
                            ByVal summ As String, ByVal notes As String, ByVal isLast As Boolean)
    Dim body As String
    If HasAppendixSummary(summ) Then body = body & summ
    If HasAppendixNotes(notes) Then body = body & notes
    If Len(body) = 0 Then Exit Sub      ' nothing to save for this chapter

    If isLast Then
        result.Add header & vbCr & body & vbCr & vbCr    ' extra blank lines after the last entry
    Else
        result.Add header & vbCr & body
    End If
End Sub

' HasAppendixSummary: True if the text contains something besides just the
' "Summary:" label (i.e. there's an actual summary).
Private Function HasAppendixSummary(ByVal value As String) As Boolean
    Dim cleaned As String
    cleaned = Replace(value, vbCr, "")
    cleaned = Replace(cleaned, vbLf, "")
    cleaned = Replace(cleaned, Chr(160), " ")
    cleaned = Trim$(cleaned)

    If Len(cleaned) = 0 Or LCase$(cleaned) = "summary:" Then
        HasAppendixSummary = False
    Else
        HasAppendixSummary = True
    End If
End Function

' HasAppendixNotes: same idea, but for the "Notes:" label.
Private Function HasAppendixNotes(ByVal value As String) As Boolean
    Dim cleaned As String
    cleaned = Replace(value, vbCr, "")
    cleaned = Replace(cleaned, vbLf, "")
    cleaned = Replace(cleaned, Chr(160), " ")
    cleaned = Trim$(cleaned)

    If Len(cleaned) = 0 Or LCase$(cleaned) = "notes:" Then
        HasAppendixNotes = False
    Else
        HasAppendixNotes = True
    End If
End Function

' IsAO3NotesEndMarker: True if a line is one of AO3's page-footer/navigation
' strings ("Comments", "Bookmark", "Site Map"...). When we hit one while
' collecting notes, we know the notes are over.
' "Select Case" is a cleaner alternative to many If/ElseIf statements: it
' compares one value against a list of possibilities (comma-separated).
Private Function IsAO3NotesEndMarker(ByVal value As String) As Boolean
    Dim marker As String
    marker = LCase$(Trim$(value))

    Select Case marker
        Case "series this work belongs to:", _
             "actions", _
             "top", _
             "bookmark", _
             "comments", _
             "post comment", _
             "comment as herino", _
             "plain text with limited html ?", _
             "comment", _
             "footer", _
             "customize", _
             "about the archive", _
             "site map", _
             "diversity statement", _
             "terms of service", _
             "content policy", _
             "dmca & tida policies", _
             "site status", _
             "contact us", _
             "policy questions & abuse reports", _
             "development", _
             "otwarchive v1.6.0.3", _
             "known issues", _
             "gpl-2.0-or-later by the otw"
            IsAO3NotesEndMarker = True        ' (no Else needed: default is False)
    End Select
End Function

' IsAO3NotesPlaceholder: True for AO3's auto-generated lines like
' "(See the end of the chapter for notes.)" -- not real content.
Private Function IsAO3NotesPlaceholder(ByVal value As String) As Boolean
    value = Trim$(value)    ' ByVal params are local copies, so changing them is safe

    IsAO3NotesPlaceholder = _
        (InStr(1, value, "(See the end of the chapter", vbTextCompare) > 0) Or _
        (InStr(1, value, "(See the end of the work", vbTextCompare) > 0)
End Function

' StripMarkdownLink: "[Chapter 3: Title](http://...)" -> "Chapter 3: Title".
' Takes the text between "[" and "](".
Private Function StripMarkdownLink(ByVal value As String) As String
    Dim result As String
    Dim closeBracket As Long

    result = Trim$(value)

    If Left$(result, 1) = "[" Then
        closeBracket = InStr(1, result, "](", vbBinaryCompare)   ' vbBinaryCompare = exact, case-sensitive
        If closeBracket > 2 Then
            result = Mid$(result, 2, closeBracket - 2)
        End If
    End If

    StripMarkdownLink = Trim$(result)
End Function

' CollapseSpaces: turns any run of multiple spaces into a single space.
' Loop idea: keep replacing "two spaces" with "one space" until no double
' spaces remain.
Private Function CollapseSpaces(ByVal value As String) As String
    Dim result As String
    result = value
    Do While InStr(result, "  ") > 0
        result = Replace(result, "  ", " ")
    Loop
    CollapseSpaces = result
End Function

' IsChapterHeading: True if the text looks like "Chapter 5" / "Chapter 5: ..."
' / "Chapter 5." / "Chapter 5)" (also works on Markdown links).
Private Function IsChapterHeading(ByVal value As String) As Boolean
    Dim heading As String
    Dim parts() As String
    Dim numberPart As String

    heading = CleanAppendixParagraph(value)
    heading = StripMarkdownLink(heading)

    parts = Split(heading, " ")
    If UBound(parts) < 1 Then Exit Function   ' fewer than 2 words: can't be a heading

    numberPart = parts(1)
    ' Strip trailing punctuation so "5:" or "5." still counts as the number 5.
    numberPart = Replace(numberPart, ":", "")
    numberPart = Replace(numberPart, ".", "")
    numberPart = Replace(numberPart, ")", "")

    If LCase$(parts(0)) <> "chapter" Then Exit Function
    If Not IsNumeric(numberPart) Then Exit Function

    IsChapterHeading = True
End Function

' IsAppendixChapterHeading: just another name for IsChapterHeading
' (a "wrapper" function; kept so older code that calls this name still works).
Private Function IsAppendixChapterHeading(ByVal value As String) As Boolean
    IsAppendixChapterHeading = IsChapterHeading(value)
End Function

' NormalizeAppendixChapterHeading: gives a clean chapter title (no Markdown
' quote/heading marks, no link syntax).
Private Function NormalizeAppendixChapterHeading(ByVal value As String) As String
    Dim heading As String

    heading = CleanAppendixParagraph(value)
    heading = StripMarkdownLink(heading)

    NormalizeAppendixChapterHeading = Trim$(heading)
End Function


' UnlinkSectionFooters: by default each section's footer is "linked to
' previous" (copies the one before). Setting LinkToPrevious = False lets this
' section have its own footer. Does the 3 kinds: normal, even-page, first-page.
Private Sub UnlinkSectionFooters(ByVal sec As Section)
    sec.Footers(wdHeaderFooterPrimary).LinkToPrevious = False
    sec.Footers(wdHeaderFooterEvenPages).LinkToPrevious = False
    sec.Footers(wdHeaderFooterFirstPage).LinkToPrevious = False
End Sub

' UnlinkSectionHeadersAndFooters: same, but for headers too.
Private Sub UnlinkSectionHeadersAndFooters(ByVal sec As Section)
    sec.Headers(wdHeaderFooterPrimary).LinkToPrevious = False
    sec.Footers(wdHeaderFooterPrimary).LinkToPrevious = False
    sec.Headers(wdHeaderFooterEvenPages).LinkToPrevious = False
    sec.Footers(wdHeaderFooterEvenPages).LinkToPrevious = False
    sec.Headers(wdHeaderFooterFirstPage).LinkToPrevious = False
    sec.Footers(wdHeaderFooterFirstPage).LinkToPrevious = False
End Sub

' ReplaceAllText: a wrapper that makes Find & Replace a one-liner.
' Without it, every replacement would need ~12 lines of .Find setup.
'   targetRange : the part of the document to search
'   findText / replaceText : what to find / what to put instead
'   wrapMode    : Optional (has a default). wdFindContinue = keep searching past
'                 the range's end and wrap around; wdFindStop = stay in range.
' Replace:=wdReplaceAll replaces every match, not just the first.
' The flags are explicitly reset each time because Word REMEMBERS Find
' settings between calls; resetting avoids surprises from earlier searches.
Private Sub ReplaceAllText(ByVal targetRange As Range, _
                           ByVal findText As String, _
                           ByVal replaceText As String, _
                           Optional ByVal wrapMode As Long = wdFindContinue)
    With targetRange.Find
        .ClearFormatting
        .Replacement.ClearFormatting
        .Text = findText
        .Replacement.Text = replaceText
        .Forward = True
        .Wrap = wrapMode
        .Format = False
        .MatchCase = False
        .MatchWholeWord = False
        .MatchByte = False
        .MatchAllWordForms = False
        .MatchSoundsLike = False
        .MatchWildcards = False
        .MatchFuzzy = False
        .Execute Replace:=wdReplaceAll
    End With
End Sub
