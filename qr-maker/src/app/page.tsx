"use client"
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import JSZip from 'jszip';
import QRCode from 'qrcode';

interface QRData {
  Dom: string;
  ID: string;
}

const QRGenerator: React.FC = () => {
  const [startingNumber, setStartingNumber] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [addText, setAddText] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [downloadReady, setDownloadReady] = useState<boolean>(false);
  const [generatedZip, setGeneratedZip] = useState<Blob | null>(null);

  // Function to generate random 2 letter combination
  const generateRandomLetters = (): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters.charAt(Math.floor(Math.random() * 26)) + 
           letters.charAt(Math.floor(Math.random() * 26));
  };

  // Function to convert number to hex
  const toHex = (num: number): string => {
    return num.toString(16).toUpperCase().padStart(2, '0');
  };

  const generateQRWithText = async (qrData: string, text: string): Promise<Blob> => {
    // QR code parameters to match Python script
    const qrOptions: QRCode.QRCodeToDataURLOptions = {
      errorCorrectionLevel: 'L',
      margin: 2,
      width: 150,
      color: {
        dark: '#000000',
        light: '#ffffff',
      }
    };

    // Generate initial QR code
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, qrData, qrOptions);
    
    // Create final canvas with space for text if needed
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Dimensions and padding (matching Python script)
    const qrSize = qrCanvas.width;
    const padding = 5;
    const extraPaddingBelow = 5;
    const fontSize = 16;
    
    if (addText) {
      // Set up text to measure dimensions
      ctx.font = `bold ${fontSize}px Arial`;
      const textHeight = fontSize;
      
      // Set canvas dimensions
      canvas.width = qrSize;
      canvas.height = qrSize + textHeight + padding + extraPaddingBelow;
      
      // Fill background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code
      ctx.drawImage(qrCanvas, 0, 0);
      
      // Draw text
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      const textY = qrSize + padding - 5;
      ctx.fillText(text, canvas.width / 2, textY);
    } else {
      // Just use the QR code without text
      canvas.width = qrSize;
      canvas.height = qrSize;
      ctx.drawImage(qrCanvas, 0, 0);
    }

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          throw new Error('Failed to create blob from canvas');
        }
      }, 'image/png', 0.8);
    });
  };

  const generateQRCodes = async (): Promise<void> => {
    try {
      setIsGenerating(true);
      setError('');
      setDownloadReady(false);
      setProgress(0);

      const startNum = parseInt(startingNumber);
      const qty = parseInt(quantity);

      if (isNaN(startNum) || isNaN(qty) || qty <= 0) {
        throw new Error('Please enter valid numbers');
      }

      const zip = new JSZip();
      const qrFolder = zip.folder("qr-codes");
      
      if (!qrFolder) {
        throw new Error('Failed to create ZIP folder');
      }

      // Generate random letters once for the entire batch
      const batchLetters = generateRandomLetters();
      
      // Process in smaller batches to prevent UI freezing
      const batchSize = 10;
      const batches = Math.ceil(qty / batchSize);

      for (let batch = 0; batch < batches; batch++) {
        const batchPromises: Promise<void>[] = [];
        const start = batch * batchSize;
        const end = Math.min(start + batchSize, qty);

        for (let i = start; i < end; i++) {
          const currentNum = startNum + i;
          const hexNum = toHex(currentNum);
          
          const data: QRData = {
            Dom: "DSQRASSET",
            ID: `${batchLetters}${hexNum}`
          };

          const qrData = JSON.stringify(data);
          const promise = generateQRWithText(qrData, data.ID)
            .then(blob => {
              qrFolder.file(`${data.ID}.png`, blob);
            });

          batchPromises.push(promise);
        }

        // Wait for current batch to complete
        await Promise.all(batchPromises);
        
        // Update progress
        setProgress(((batch + 1) * batchSize / qty) * 100);

        // Small delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Generate zip file
      const content = await zip.generateAsync({ type: "blob" });
      setGeneratedZip(content);
      setDownloadReady(true);
      setError('success');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (): void => {
    if (generatedZip) {
      const url = URL.createObjectURL(generatedZip);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QRMaker-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Asset QR Code Generator</CardTitle>
          <CardDescription>
            Generate bulk QR codes for assets with custom IDs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startingNumber">Starting Number</Label>
              <Input
                id="startingNumber"
                type="number"
                placeholder="Enter starting number"
                value={startingNumber}
                onChange={(e) => setStartingNumber(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="Enter quantity (max 2000)"
                value={quantity}
                onChange={(e) => setQuantity(Math.min(2000, parseInt(e.target.value) || '').toString())}
                disabled={isGenerating}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="add-text"
                checked={addText}
                onCheckedChange={setAddText}
                disabled={isGenerating}
              />
              <Label htmlFor="add-text">Add ID text below QR code</Label>
            </div>

            {error && (
              <Alert variant={error === 'success' ? 'default' : 'destructive'}>
                {error === 'success' ? (
                  <>
                    <AlertTitle>Generation Complete!</AlertTitle>
                    <AlertDescription>Your QR codes are ready. Click the Download ZIP button to get your files.</AlertDescription>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </>
                )}
              </Alert>
            )}

            {isGenerating && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-gray-500 text-center">
                  Generating QR codes: {Math.round(progress)}%
                </p>
              </div>
            )}

            <div className="flex space-x-4">
              <Button
                className="flex-1"
                onClick={generateQRCodes}
                disabled={isGenerating || !startingNumber || !quantity}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating
                  </>
                ) : (
                  'Generate QR Codes'
                )}
              </Button>

              {downloadReady && (
                <Button
                  className="flex-1"
                  onClick={handleDownload}
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download ZIP
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRGenerator;