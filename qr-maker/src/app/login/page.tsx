"use client"
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AuthResponse {
  error?: string;
}

const LoginPage: React.FC = () => {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const passkey = formData.get('passkey') as string;

    try {
      const response = await fetch('/api/auth/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passkey }),
      });

      if (response.ok) {
        window.location.href = '/';
      } else {
        // Handle error
        const error = await response.json() as AuthResponse;
        alert(error.error || 'Invalid passkey');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>QR Code Generator Access</CardTitle>
          <CardDescription>
            Please enter the passkey to access the QR code generator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passkey">Passkey</Label>
                <Input
                  id="passkey"
                  name="passkey"
                  type="password"
                  placeholder="Enter passkey"
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Access Generator
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;