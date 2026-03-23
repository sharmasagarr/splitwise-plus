import { Linking, Alert } from 'react-native';

/**
 * Opens a UPI payment app with pre-filled payment details.
 * Returns true if the UPI app was opened, false otherwise.
 */
export const openUpiPayment = async (
  upiId: string,
  payeeName: string,
  amount: number,
  note?: string,
): Promise<boolean> => {
  const encodedName = encodeURIComponent(payeeName);
  const encodedNote = encodeURIComponent(note || 'Splitwise+ Settlement');
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount}&cu=INR&tn=${encodedNote}`;

  try {
    await Linking.openURL(upiUrl);
    return true;
  } catch {
    Alert.alert(
      'No UPI App Found',
      'Could not launch a UPI app. Make sure Google Pay, PhonePe, or Paytm is installed and enabled.',
    );
    return false;
  }
};

/**
 * Shows a confirmation dialog after user returns from UPI app.
 * Returns a promise that resolves to true if confirmed, false otherwise.
 */
export const confirmUpiPayment = (): Promise<boolean> => {
  return new Promise(resolve => {
    Alert.alert(
      '💰 Payment Confirmation',
      'Did you successfully complete the payment?',
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Yes, Paid!',
          style: 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: false },
    );
  });
};

/**
 * Prompts the user to enter a UPI ID when the payee doesn't have one saved.
 * Returns the entered UPI ID or null if cancelled.
 */
export const promptForUpiId = (): Promise<string | null> => {
  return new Promise(resolve => {
    Alert.prompt(
      'Enter UPI ID',
      "This user hasn't saved their UPI ID. Enter their UPI ID to proceed (e.g. name@upi).",
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
        {
          text: 'Continue',
          onPress: (value?: string) => {
            if (value && value.includes('@')) {
              resolve(value.trim());
            } else {
              Alert.alert(
                'Invalid UPI ID',
                'Please enter a valid UPI ID (e.g. name@upi)',
              );
              resolve(null);
            }
          },
        },
      ],
      'plain-text',
      '',
      'email-address',
    );
  });
};
