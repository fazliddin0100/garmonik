Set fso = CreateObject("Scripting.FileSystemObject")
agentDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = agentDir

On Error Resume Next
Set nodeCheck = shell.Exec("node -v")
If Err.Number <> 0 Then
  MsgBox "Node.js topilmadi." & vbCrLf & "https://nodejs.org dan LTS o'rnating.", vbCritical, "Garmonik Print Agent"
  WScript.Quit 1
End If
On Error GoTo 0

logFile = agentDir & "\agent.log"
cmd = "cmd /c node agent.js >> """ & logFile & """ 2>&1"
shell.Run cmd, 0, False
