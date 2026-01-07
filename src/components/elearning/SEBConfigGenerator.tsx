import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Shield, Download, Key, Lock, Settings } from 'lucide-react';

interface SEBConfigGeneratorProps {
  assignmentId: string;
  assignmentTitle: string;
  quizUrl: string;
  existingPassword?: string;
  existingQuitPassword?: string;
  onConfigGenerated?: (password: string, quitPassword: string) => void;
}

export function SEBConfigGenerator({
  assignmentId,
  assignmentTitle,
  quizUrl,
  existingPassword = '',
  existingQuitPassword = '',
  onConfigGenerated,
}: SEBConfigGeneratorProps) {
  const { toast } = useToast();
  const [sebPassword, setSebPassword] = useState(existingPassword);
  const [sebQuitPassword, setSebQuitPassword] = useState(existingQuitPassword);
  const [allowQuit, setAllowQuit] = useState(true);
  const [useVirtualKeyboard, setUseVirtualKeyboard] = useState(false);
  const [enableSpellCheck, setEnableSpellCheck] = useState(false);

  const generateRandomPassword = (length: number = 8) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  const generateSEBConfig = () => {
    if (!sebPassword) {
      toast({ title: 'Error', description: 'Password akses harus diisi', variant: 'destructive' });
      return;
    }

    // SEB Config XML format
    const sebConfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>startURL</key>
    <string>${quizUrl}</string>
    <key>startURLAppendQueryParameter</key>
    <string>seb=true&amp;assignmentId=${assignmentId}</string>
    <key>sebServerURL</key>
    <string></string>
    <key>hashedQuitPassword</key>
    <string>${sebQuitPassword ? btoa(sebQuitPassword) : ''}</string>
    <key>allowQuit</key>
    <${allowQuit}/>
    <key>quitURLConfirm</key>
    <true/>
    <key>hashedAdminPassword</key>
    <string>${btoa(sebPassword)}</string>
    <key>allowPreferencesWindow</key>
    <false/>
    <key>enablePlugIns</key>
    <false/>
    <key>enableJava</key>
    <false/>
    <key>enableJavaScript</key>
    <true/>
    <key>blockPopUpWindows</key>
    <true/>
    <key>allowBrowsingBackForward</key>
    <false/>
    <key>newBrowserWindowAllowReload</key>
    <false/>
    <key>showReloadButton</key>
    <false/>
    <key>showTaskBar</key>
    <false/>
    <key>showMenuBar</key>
    <false/>
    <key>enableSebBrowser</key>
    <true/>
    <key>browserWindowWebView</key>
    <integer>3</integer>
    <key>allowSpellCheck</key>
    <${enableSpellCheck}/>
    <key>enableTouchExit</key>
    <false/>
    <key>allowVirtualMachine</key>
    <false/>
    <key>allowScreenSharing</key>
    <false/>
    <key>enableURLFilter</key>
    <true/>
    <key>URLFilterEnable</key>
    <true/>
    <key>URLFilterEnableContentFilter</key>
    <false/>
    <key>URLFilterRules</key>
    <array>
        <dict>
            <key>active</key>
            <true/>
            <key>regex</key>
            <false/>
            <key>expression</key>
            <string>${new URL(quizUrl).origin}/*</string>
            <key>action</key>
            <integer>1</integer>
        </dict>
    </array>
    <key>prohibitedProcesses</key>
    <array>
        <dict>
            <key>active</key>
            <true/>
            <key>executable</key>
            <string>Discord</string>
        </dict>
        <dict>
            <key>active</key>
            <true/>
            <key>executable</key>
            <string>Slack</string>
        </dict>
        <dict>
            <key>active</key>
            <true/>
            <key>executable</key>
            <string>Telegram</string>
        </dict>
        <dict>
            <key>active</key>
            <true/>
            <key>executable</key>
            <string>WhatsApp</string>
        </dict>
    </array>
    <key>useVirtualKeyboard</key>
    <${useVirtualKeyboard}/>
    <key>examSessionClearCookiesOnStart</key>
    <true/>
    <key>examSessionClearCookiesOnEnd</key>
    <true/>
    <key>sebConfigPurpose</key>
    <integer>0</integer>
    <key>originatorVersion</key>
    <string>SEB_Win_3.5.0</string>
</dict>
</plist>`;

    // Create and download the .seb file
    const blob = new Blob([sebConfig], { type: 'application/seb' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${assignmentTitle.replace(/[^a-zA-Z0-9]/g, '_')}_SEB.seb`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Notify parent component
    if (onConfigGenerated) {
      onConfigGenerated(sebPassword, sebQuitPassword);
    }

    toast({
      title: 'Sukses',
      description: 'File konfigurasi SEB berhasil di-generate. Bagikan file dan password kepada mahasiswa.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5" />
          Safe Exam Browser Configuration
        </CardTitle>
        <CardDescription>
          Generate file .seb untuk mengamankan quiz dengan Safe Exam Browser
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Password Akses Quiz
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={sebPassword}
                onChange={(e) => setSebPassword(e.target.value)}
                placeholder="Password untuk akses quiz..."
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSebPassword(generateRandomPassword())}
                title="Generate password"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Password yang harus dimasukkan mahasiswa untuk mengakses quiz
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password Keluar SEB
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={sebQuitPassword}
                onChange={(e) => setSebQuitPassword(e.target.value)}
                placeholder="Password untuk keluar SEB (opsional)..."
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSebQuitPassword(generateRandomPassword())}
                title="Generate password"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Password untuk keluar dari SEB sebelum quiz selesai (untuk pengawas)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="text-sm">Izinkan Keluar</Label>
              <p className="text-xs text-muted-foreground">Allow quit SEB</p>
            </div>
            <Switch checked={allowQuit} onCheckedChange={setAllowQuit} />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="text-sm">Virtual Keyboard</Label>
              <p className="text-xs text-muted-foreground">On-screen keyboard</p>
            </div>
            <Switch checked={useVirtualKeyboard} onCheckedChange={setUseVirtualKeyboard} />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="text-sm">Spell Check</Label>
              <p className="text-xs text-muted-foreground">Enable spell check</p>
            </div>
            <Switch checked={enableSpellCheck} onCheckedChange={setEnableSpellCheck} />
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Fitur Keamanan SEB:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Memblokir akses ke aplikasi lain (Discord, WhatsApp, dll)</li>
            <li>• Menonaktifkan copy-paste dan screenshot</li>
            <li>• Membatasi navigasi hanya ke halaman quiz</li>
            <li>• Mendeteksi virtual machine dan screen sharing</li>
          </ul>
        </div>

        <Button onClick={generateSEBConfig} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Generate & Download File .seb
        </Button>
      </CardContent>
    </Card>
  );
}
