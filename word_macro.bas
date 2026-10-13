Sub TypesetFormattingMacro3()
MsgBox "star ...", vbInformation + vbOKOnly, "Macro Start"
Application.ScreenUpdating = False

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

Dim savedText24 As String
savedText24 = ""

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

With ActiveDocument.PageSetup
    .PageWidth = InchesToPoints(6)
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
        .keepWithNext = True
        .KeepTogether = True
        .PageBreakBefore = False
        .OutlineLevel = wdOutlineLevel1
    End With
End With

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

ActiveDocument.Range.Style = wdStyleNormal

' ===================== PARSE INPUT =====================
' Layout:  header (Key: Value lines) / ---- / story / [APPENDIX / ---- / notes]

Dim doc90 As Document
Dim sepIdx As Long
Dim appIdx As Long
Dim hdrLimit As Long
Set doc90 = ActiveDocument

sepIdx = FindSeparatorIndex(doc90)
If sepIdx > 0 Then
    hdrLimit = sepIdx - 1
Else
    hdrLimit = 60
End If
appIdx = FindAppendixIndex(doc90, sepIdx)

Dim chapStr As String
Dim isSingleChapter As Boolean
Dim hasChapterHeadings As Boolean
chapStr = GetHeaderValue(doc90, "Chapters", hdrLimit)
isSingleChapter = (Trim(chapStr) = "1/1" Or Trim(chapStr) = "1" Or Trim(chapStr) = "")
hasChapterHeadings = (CountBodyChapterHeadings(doc90, sepIdx, appIdx) > 0)

Dim titleLine68 As String
Dim authorLine68 As String
titleLine68 = GetHeaderValue(doc90, "Title", hdrLimit)
titleLine68 = Trim(Replace(titleLine68, "/", ""))
authorLine68 = GetHeaderValue(doc90, "Author", hdrLimit)

On Error Resume Next
ActiveDocument.Variables("Title").Value = titleLine68
If Err.Number <> 0 Then
    Err.Clear
    ActiveDocument.Variables.Add Name:="Title", Value:=titleLine68
End If
ActiveDocument.Variables("Author").Value = authorLine68
If Err.Number <> 0 Then
    Err.Clear
    ActiveDocument.Variables.Add Name:="Author", Value:=authorLine68
End If
On Error GoTo 0

' Build the appendix collection from the APPENDIX section, then remove it from the body
Dim chapterCollection96 As Collection
Set chapterCollection96 = BuildAppendixCollection(doc90, appIdx, authorLine68)

If appIdx > 0 Then
    doc90.Range(doc90.Paragraphs(appIdx).Range.Start, doc90.Content.End).Delete
End If

Dim Relationship As String
Dim SeriesPart As String
Dim pubStr As String
Dim updStr As String
Dim sumText As String
Dim isBundle As Boolean

Blurb = ""
SeriesPart = ""
Relationship = ""

pubStr = GetHeaderValue(doc90, "Published", hdrLimit)
updStr = GetHeaderValue(doc90, "Updated", hdrLimit)
If updStr = "" Then updStr = GetHeaderValue(doc90, "Completed", hdrLimit)

If Len(pubStr) >= 4 Then Year1 = Left$(pubStr, 4)
If Not isSingleChapter And Len(updStr) >= 4 Then
    If InStr(chapStr, "/") > 0 Then
        If IsWorkComplete(chapStr) Then Year2 = Left$(updStr, 4)
    ElseIf Left$(updStr, 4) <> Year1 Then
        Year2 = Left$(updStr, 4)
    End If
End If

Fandom = GetHeaderValue(doc90, "Fandoms", hdrLimit)
If Fandom = "" Then Fandom = GetHeaderValue(doc90, "Fandom", hdrLimit)
Fandom = Fandom & vbCr

Rating = GetHeaderValue(doc90, "Rating", hdrLimit) & vbCr
WordCount = GetHeaderValue(doc90, "Words", hdrLimit) & vbCr
HitCount = GetHeaderValue(doc90, "Hits", hdrLimit) & vbCr
KudosCount = GetHeaderValue(doc90, "Kudos", hdrLimit) & vbCr

Relationship = GetHeaderValue(doc90, "Relationships", hdrLimit)
SeriesPart = FormatSeries(GetHeaderValue(doc90, "Series", hdrLimit))

' Summary may span several lines (it is the last header field)
sumText = GetHeaderSummary(doc90, hdrLimit)
' Bundled series use "Summary: Series: <Series Title>" as a marker, not a real blurb
isBundle = (LCase$(Left$(Trim$(sumText), 7)) = "series:")
If isBundle Then
    Blurb = ""
    savedText24 = ""
Else
    Blurb = sumText
    Do While Right$(Blurb, 1) = vbCr
        Blurb = Left$(Blurb, Len(Blurb) - 1)
    Loop
    If Len(sumText) > 0 Then savedText24 = "Summary:" & vbCr & sumText
End If

If sepIdx > 0 Then
    doc90.Range(0, doc90.Paragraphs(sepIdx).Range.End).Delete
End If

If hasChapterHeadings Then
    Dim firstChapterFound As Boolean
    Dim chNum As String
    Dim lastChapterNumber As String
    firstChapterFound = False
    For Each para In ActiveDocument.Paragraphs
        chNum = GetBodyChapterNumber(para.Range.Text)
        If Len(chNum) > 0 Then
            If firstChapterFound = False Or chNum <> lastChapterNumber Then
                para.Range.Font.Reset
                para.Range.ParagraphFormat.Reset
                If firstChapterFound Then
                    para.Range.InsertBreak Type:=wdSectionBreakNextPage
                Else
                    firstChapterFound = True
                End If
                para.Range.Style = ActiveDocument.Styles(wdStyleHeading1)
                lastChapterNumber = chNum
            End If
        End If
    Next para
End If

Dim para11 As Paragraph
For Each para11 In ActiveDocument.Paragraphs
    If Trim(para11.Range.Text) = "Chapter Text" Then
        para11.Range.Delete
    End If
Next para11

Dim oPara As Paragraph
For Each oPara In ActiveDocument.Paragraphs
    If oPara.Range.Style = wdStyleNormal Then
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

Dim sec45 As Section
For Each sec45 In ActiveDocument.Sections
    With sec45
        .PageSetup.OddAndEvenPagesHeaderFooter = True
        .PageSetup.DifferentFirstPageHeaderFooter = True
    End With
Next sec45

Dim i2 As Integer
Const numSectionBreaks As Integer = 3
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
Selection.EndKey Unit:=wdStory

Dim doc87 As Document
Dim rng87 As Range
Dim title87 As String
Set doc87 = ActiveDocument
title87 = doc87.Variables("Title").Value
Set rng87 = doc87.Sections(1).Range
rng87.Collapse Direction:=wdCollapseStart
rng87.InsertAfter title87
rng87.Style = wdStyleHeading1
rng87.Font.Size = 30
ActiveDocument.Sections(1).PageSetup.VerticalAlignment = wdAlignVerticalCenter

Dim doc20 As Document
Dim rng20 As Range
Dim blankText As String
Set doc20 = ActiveDocument
blankText = "Intentionally Blank"
Set rng20 = doc20.Sections(2).Range
rng20.Collapse Direction:=wdCollapseStart
rng20.InsertAfter blankText
rng20.Style = wdStyleNormal
rng20.ParagraphFormat.alignment = wdAlignParagraphCenter
rng20.Start = rng20.End - Len(blankText)
rng20.Font.Hidden = True
doc20.Sections(2).PageSetup.VerticalAlignment = wdAlignVerticalCenter

Selection.Find.ClearFormatting
Selection.Find.Replacement.ClearFormatting
ReplaceAllText Selection.Range, "--", "^+", wdFindContinue

Dim para33 As Paragraph
Dim rng33 As Range
Dim str33 As String
Dim paraToChange As Collection
Set paraToChange = New Collection
For Each para33 In ActiveDocument.Paragraphs
    str33 = Trim(Replace(para33.Range.Text, vbCr, ""))
    If (str33 = "~" Or str33 = "~~~" Or str33 = "- - -" Or str33 = "---" Or str33 = ChrW(10038) Or str33 = ".::." Or str33 = ChrW(8212) Or str33 = "**" Or str33 = "****" Or str33 = "*****" Or str33 = "******" Or str33 = "*******" Or str33 = "*" Or str33 = ".") And str33 <> "***" Then
        paraToChange.Add para33
    End If
Next para33

For Each para33 In paraToChange
    Set rng33 = para33.Range
    rng33.Text = vbCr & "***" & vbCr & vbCr
Next para33

ReplaceAllText Selection.Range, "^p^p", "^p", wdFindContinue
ReplaceAllText Selection.Range, "  ", " ", wdFindContinue

Dim doc80 As Document
Dim rng80 As Range
Dim info As String
Set doc80 = ActiveDocument
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
   "Kudos: " & KudosCount & vbNewLine & vbNewLine
If Len(Blurb) > 0 Then
    info = info & "***" & vbNewLine & vbNewLine & Blurb
End If

doc80.Sections(3).Range.InsertBreak Type:=wdSectionBreakNextPage
Set rng80 = doc80.Sections(4).Range
rng80.Text = info
rng80.Style = wdStyleSubtitle
doc80.Sections(4).PageSetup.VerticalAlignment = wdAlignVerticalCenter

Dim oDoc37 As Document
Dim oCC37 As ContentControl
Dim Rng37 As Range
Dim RngColl As New Collection
Dim i37 As Long
Dim placeholderTexts() As Variant
Set oDoc37 = ActiveDocument
Set Rng37 = oDoc37.Sections(4).Range
placeholderTexts = Array("URL", "Name, Year", "Name, Year")
With Rng37.Find
    .Text = "#&[1-3]"
    .Forward = True
    .Wrap = wdFindStop
    .MatchWildcards = True
    While .Execute
        RngColl.Add Rng37.Duplicate
    Wend
End With

For i37 = 1 To RngColl.Count
    Set Rng37 = RngColl(i37)
    Rng37.MoveEnd Count:=-1
    Rng37.End = Rng37.Paragraphs.First.Range.End
    Set oCC37 = oDoc37.ContentControls.Add(wdContentControlText, Rng37)
    oCC37.Title = "Your Title Here"
    oCC37.SetPlaceholderText , , placeholderTexts(i37 - 1)
    oCC37.Range.Text = ""
Next i37

Dim doc86 As Document
Dim rng86 As Range
Dim title86 As String
Dim author86 As String
Set doc86 = ActiveDocument
title86 = doc86.Variables("Title").Value
author86 = doc86.Variables("Author").Value
Set rng86 = doc86.Sections(3).Range
rng86.Collapse Direction:=wdCollapseStart
rng86.InsertAfter title86 & vbCr & author86
rng86.Start = rng86.Start
rng86.End = rng86.Start + Len(title86)
rng86.Style = wdStyleHeading2
Set rng86 = doc86.Sections(3).Range
rng86.Start = rng86.Start + Len(title86) + 1
rng86.End = rng86.Start + Len(author86)
rng86.Style = wdStyleHeading3

Dim sec79 As Section
For Each sec79 In ActiveDocument.Sections
    sec79.PageSetup.OddAndEvenPagesHeaderFooter = True
    sec79.PageSetup.DifferentFirstPageHeaderFooter = True
    sec79.PageSetup.FooterDistance = InchesToPoints(0.4)
    UnlinkSectionFooters sec79
    sec79.Footers(wdHeaderFooterPrimary).Range.Text = ""
    sec79.Footers(wdHeaderFooterEvenPages).Range.Text = ""
    sec79.Footers(wdHeaderFooterFirstPage).Range.Text = ""
    If sec79.Index > 6 Then
        With sec79.Footers(wdHeaderFooterPrimary).Range
            .Fields.Add Range:=.Characters.Last, Type:=wdFieldPage
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
Set rngAuthor22 = docFinal22.Content
rngAuthor22.Collapse Direction:=wdCollapseEnd
rngAuthor22.InsertBreak Type:=wdSectionBreakNextPage

Set notesSection22 = docFinal22.Sections(docFinal22.Sections.Count)
Set rngAuthor22 = notesSection22.Range
rngAuthor22.Collapse Direction:=wdCollapseStart
rngAuthor22.InsertAfter _
    "Author's Notes" & vbCr & _
    "A collection of Notes and Summaries from the original published works on archiveofourown.org" & _
    vbCr & vbCr

Set rngAuthor22 = notesSection22.Range
With rngAuthor22.Find
    .ClearFormatting
    .Text = "Author's Notes"
    .Forward = True
    .Wrap = wdFindStop
    .Format = False
    .MatchCase = False
    .MatchWholeWord = True
    If .Execute Then rngAuthor22.Style = wdStyleHeading1
End With

If Len(savedText24) > 0 Then
    Set rngAuthor22 = notesSection22.Range
    rngAuthor22.Collapse Direction:=wdCollapseEnd
    rngAuthor22.InsertAfter savedText24
    rngAuthor22.Collapse Direction:=wdCollapseEnd
End If

Set rngAuthor22 = notesSection22.Range
rngAuthor22.Collapse Direction:=wdCollapseEnd
chapterNoteStart22 = rngAuthor22.Start

For chapterIndex95 = 1 To chapterCollection96.Count
    chapterText95 = chapterCollection96.Item(chapterIndex95)
    rngAuthor22.InsertAfter chapterText95
    rngAuthor22.Collapse Direction:=wdCollapseEnd
Next chapterIndex95

chapterNoteEnd22 = rngAuthor22.Start

If chapterNoteEnd22 > chapterNoteStart22 Then
    Set rngChapterNotes22 = docFinal22.Range(chapterNoteStart22, chapterNoteEnd22)
    For Each paraFormat22 In rngChapterNotes22.Paragraphs
        Dim formatText22 As String
        formatText22 = CleanAppendixParagraph(paraFormat22.Range.Text)
        If IsAppendixChapterHeading(formatText22) Then
            paraFormat22.Style = docFinal22.Styles(wdStyleHeading4)
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

Application.ScreenUpdating = True
MsgBox "Macro ran successfully!", vbInformation
End Sub

' ===================== HELPERS =====================

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

' First paragraph (within the first 200) made only of 5+ dashes = end of header
Private Function FindSeparatorIndex(ByVal doc As Document) As Long
    Dim p As Paragraph
    Dim idx As Long
    Dim t As String
    For Each p In doc.Paragraphs
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

' Last paragraph after the header that reads exactly "APPENDIX" (0 if none)
Private Function FindAppendixIndex(ByVal doc As Document, ByVal sepIdx As Long) As Long
    Dim p As Paragraph
    Dim idx As Long
    Dim found As Long
    For Each p In doc.Paragraphs
        idx = idx + 1
        If idx > sepIdx Then
            If UCase$(CleanParaText(p.Range.Text)) = "APPENDIX" Then found = idx
        End If
    Next p
    FindAppendixIndex = found
End Function

Private Function GetHeaderValue(ByVal doc As Document, ByVal key As String, ByVal lastPara As Long) As String
    Dim p As Paragraph
    Dim idx As Long
    Dim t As String
    For Each p In doc.Paragraphs
        idx = idx + 1
        If idx > lastPara Then Exit For
        t = CleanParaText(p.Range.Text)
        If LCase$(Left$(t, Len(key) + 1)) = LCase$(key) & ":" Then
            GetHeaderValue = Trim$(Mid$(t, Len(key) + 2))
            Exit Function
        End If
    Next p
End Function

Private Function GetHeaderSummary(ByVal doc As Document, ByVal lastPara As Long) As String
    Dim p As Paragraph
    Dim idx As Long
    Dim t As String
    Dim acc As String
    Dim found As Boolean
    For Each p In doc.Paragraphs
        idx = idx + 1
        If idx > lastPara Then Exit For
        t = CleanParaText(p.Range.Text)
        If Not found Then
            If LCase$(Left$(t, 8)) = "summary:" Then found = True Else t = ""
        End If
        If found Then
            ' strip any "Summary:" label(s) at the start of the line
            Do While LCase$(Left$(t, 8)) = "summary:"
                t = Trim$(Mid$(t, 9))
            Loop
            If Len(t) > 0 Then acc = acc & t & vbCr
        End If
    Next p
    GetHeaderSummary = acc
End Function

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

Private Function FormatSeries(ByVal raw As String) As String
    Dim partPos As Long
    Dim ofPos As Long
    raw = Trim$(raw)
    If raw = "" Then Exit Function
    partPos = InStr(1, raw, "Part ", vbTextCompare)
    If partPos > 0 Then ofPos = InStr(partPos + 5, raw, " of ", vbTextCompare)
    If partPos > 0 And ofPos > 0 Then
        FormatSeries = Trim$(Mid$(raw, ofPos + 4)) & ", Part " & Trim$(Mid$(raw, partPos + 5, ofPos - (partPos + 5)))
    Else
        FormatSeries = raw
    End If
End Function

' Returns the chapter number if the text is "Chapter N" or "Chapter N: ...", else ""
Private Function GetBodyChapterNumber(ByVal value As String) As String
    Dim t As String
    Dim colonPos As Long
    Dim parts() As String
    t = CleanParaText(value)
    colonPos = InStr(t, ":")
    If colonPos > 0 Then t = Left$(t, colonPos - 1)
    t = Trim$(t)
    If Len(t) = 0 Then Exit Function
    parts = Split(t, " ")
    If UBound(parts) <> 1 Then Exit Function
    If parts(0) <> "Chapter" Then Exit Function
    If Not IsNumeric(parts(1)) Then Exit Function
    GetBodyChapterNumber = parts(1)
End Function

' Counts "Chapter N: ..." headings in the story (between the header and the appendix)
Private Function CountBodyChapterHeadings(ByVal doc As Document, ByVal sepIdx As Long, ByVal appIdx As Long) As Long
    Dim p As Paragraph
    Dim idx As Long
    Dim n As Long
    For Each p In doc.Paragraphs
        idx = idx + 1
        If idx > sepIdx Then
            If appIdx > 0 And idx >= appIdx Then Exit For
            If Len(GetBodyChapterNumber(p.Range.Text)) > 0 Then n = n + 1
        End If
    Next p
    CountBodyChapterHeadings = n
End Function

Private Function CleanAppendixParagraph(ByVal value As String) As String
    Dim result As String
    result = value
    result = Replace(result, vbCr, "")
    result = Replace(result, Chr(7), "")
    result = Replace(result, vbLf, "")
    result = Replace(result, Chr(160), " ")
    result = Trim$(result)
    Do While Len(result) > 0 And Left$(result, 1) = ">"
        result = Trim$(Mid$(result, 2))
    Loop
    Do While Len(result) > 0 And Left$(result, 1) = "#"
        result = Trim$(Mid$(result, 2))
    Loop
    result = CollapseSpaces(result)
    CleanAppendixParagraph = Trim$(result)
End Function

' True if the line is just an author name (the byline AO3 puts under "Notes:" in bundles)
Private Function IsAuthorByline(ByVal txt As String, ByVal authorList As String) As Boolean
    Dim parts() As String
    Dim j As Long
    If Len(txt) = 0 Or Len(authorList) = 0 Then Exit Function
    If LCase$(txt) = LCase$(Trim$(authorList)) Then
        IsAuthorByline = True
        Exit Function
    End If
    parts = Split(authorList, ",")
    For j = LBound(parts) To UBound(parts)
        If LCase$(Trim$(parts(j))) = LCase$(txt) Then
            IsAuthorByline = True
            Exit Function
        End If
    Next j
End Function

' Parses everything after the APPENDIX line.
'   Chapter N: Title
'   Notes:            (may appear several times; merged under one "Notes:")
'   Summary: text     (inline text or text on following lines)
Private Function BuildAppendixCollection(ByVal doc As Document, ByVal appIdx As Long, ByVal authorList As String) As Collection
    Dim result As New Collection
    Dim rng As Range
    Dim p As Paragraph
    Dim texts() As String
    Dim cnt As Long
    Dim k As Long
    Dim i As Long
    Dim txt As String
    Dim lowerTxt As String
    Dim restTxt As String
    Dim currentHeader As String
    Dim currentSummary As String
    Dim currentNotes As String
    Dim inSummary As Boolean
    Dim inNotes As Boolean
    Dim workNotes As String
    Dim inWorkNotes As Boolean

    If appIdx <= 0 Then
        Set BuildAppendixCollection = result
        Exit Function
    End If

    Set rng = doc.Range(doc.Paragraphs(appIdx).Range.Start, doc.Content.End)
    cnt = rng.Paragraphs.Count
    ReDim texts(1 To cnt)
    For Each p In rng.Paragraphs
        k = k + 1
        texts(k) = CleanAppendixParagraph(p.Range.Text)
    Next p

    For i = 2 To cnt   ' 1 = the "APPENDIX" line itself
        txt = texts(i)
        lowerTxt = LCase$(txt)

        If IsAppendixChapterHeading(txt) Then
            If currentHeader <> "" Then
                AddChapterEntry result, currentHeader, currentSummary, currentNotes, False
            End If
            currentHeader = NormalizeAppendixChapterHeading(txt)
            currentSummary = ""
            currentNotes = ""
            inSummary = False
            inNotes = False
        ElseIf currentHeader <> "" Then
            If lowerTxt = "notes:" Then
                inSummary = False
                inNotes = True
                If Len(currentNotes) = 0 Then currentNotes = "Notes:" & vbCr
            ElseIf Left$(lowerTxt, 8) = "summary:" Then
                inSummary = True
                inNotes = False
                If Len(currentSummary) = 0 Then currentSummary = "Summary:" & vbCr
                restTxt = Trim$(Mid$(txt, 9))
                If Len(restTxt) > 0 Then currentSummary = currentSummary & restTxt & vbCr
            ElseIf lowerTxt = "chapter text" Then
                inSummary = False
                inNotes = False
            ElseIf inSummary Or inNotes Then
                If IsAO3NotesEndMarker(txt) Then
                    inSummary = False
                    inNotes = False
                ElseIf Len(txt) > 0 And Not IsAO3NotesPlaceholder(txt) Then
                    If inSummary Then
                        currentSummary = currentSummary & txt & vbCr
                    ElseIf Not IsAuthorByline(txt, authorList) Then
                        currentNotes = currentNotes & txt & vbCr
                    End If
                End If
            End If
        Else
            If lowerTxt = "notes:" Then
                inWorkNotes = True
                If Len(workNotes) = 0 Then workNotes = "Notes:" & vbCr
            ElseIf inWorkNotes Then
                If IsAO3NotesEndMarker(txt) Then
                    inWorkNotes = False
                ElseIf Len(txt) > 0 And Not IsAO3NotesPlaceholder(txt) Then
                    workNotes = workNotes & txt & vbCr
                End If
            End If
        End If
    Next i

    If currentHeader <> "" Then
        AddChapterEntry result, currentHeader, currentSummary, currentNotes, True
    End If

    If HasAppendixNotes(workNotes) Then
        result.Add workNotes & vbCr
    End If

    Set BuildAppendixCollection = result
End Function

Private Sub AddChapterEntry(ByVal result As Collection, ByVal header As String, _
                            ByVal summ As String, ByVal notes As String, ByVal isLast As Boolean)
    Dim body As String
    If HasAppendixSummary(summ) Then body = body & summ
    If HasAppendixNotes(notes) Then body = body & notes
    If Len(body) = 0 Then Exit Sub

    If isLast Then
        result.Add header & vbCr & body & vbCr & vbCr
    Else
        result.Add header & vbCr & body
    End If
End Sub

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

Private Function IsAO3NotesEndMarker(ByVal value As String) As Boolean
    Dim marker As String
    marker = LCase$(Trim$(value))
    Select Case marker
        Case "series this work belongs to:", "actions", "top", "bookmark", "comments", "post comment", "comment as herino", "plain text with limited html ?", "comment", "footer", "customize", "about the archive", "site map", "diversity statement", "terms of service", "content policy", "dmca & tida policies", "site status", "contact us", "policy questions & abuse reports", "development", "otwarchive v1.6.0.3", "known issues", "gpl-2.0-or-later by the otw"
            IsAO3NotesEndMarker = True
    End Select
End Function

Private Function IsAO3NotesPlaceholder(ByVal value As String) As Boolean
    value = Trim$(value)
    IsAO3NotesPlaceholder = _
        (InStr(1, value, "(See the end of the chapter", vbTextCompare) > 0) Or _
        (InStr(1, value, "(See the end of the work", vbTextCompare) > 0)
End Function

Private Function CollapseSpaces(ByVal value As String) As String
    Dim result As String
    result = value
    Do While InStr(result, "  ") > 0
        result = Replace(result, "  ", " ")
    Loop
    CollapseSpaces = result
End Function

' "Chapter N" or "Chapter N: Title" only (so a sentence starting "Chapter 3 is..." is not a heading)
Private Function IsChapterHeading(ByVal value As String) As Boolean
    Dim heading As String
    Dim colonPos As Long
    Dim parts() As String
    heading = CleanAppendixParagraph(value)
    colonPos = InStr(heading, ":")
    If colonPos > 0 Then heading = Left$(heading, colonPos - 1)
    heading = Trim$(heading)
    If Len(heading) = 0 Then Exit Function
    parts = Split(heading, " ")
    If UBound(parts) <> 1 Then Exit Function
    If LCase$(parts(0)) <> "chapter" Then Exit Function
    If Not IsNumeric(parts(1)) Then Exit Function
    IsChapterHeading = True
End Function

Private Function IsAppendixChapterHeading(ByVal value As String) As Boolean
    IsAppendixChapterHeading = IsChapterHeading(value)
End Function

Private Function NormalizeAppendixChapterHeading(ByVal value As String) As String
    Dim heading As String
    heading = CleanAppendixParagraph(value)
    NormalizeAppendixChapterHeading = Trim$(heading)
End Function

Private Sub UnlinkSectionFooters(ByVal sec As Section)
    sec.Footers(wdHeaderFooterPrimary).LinkToPrevious = False
    sec.Footers(wdHeaderFooterEvenPages).LinkToPrevious = False
    sec.Footers(wdHeaderFooterFirstPage).LinkToPrevious = False
End Sub

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
