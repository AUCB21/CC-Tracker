' Double-click to launch ./start.sh (heartbeat-shutdown prod server) with no window.
' The 0 in Run() = SW_HIDE, False = don't wait for the process to finish.
' If your Git for Windows is installed elsewhere, edit the bash.exe path below.
Set sh = CreateObject("Wscript.Shell")
sh.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.Run """C:\Program Files\Git\bin\bash.exe"" ./start.sh", 0, False
