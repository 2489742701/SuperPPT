/**
 * API Integration Module
 * 
 * This module defines the API endpoints for backend integration.
 * It provides functions for saving and retrieving presentation data,
 * as well as handling specific element properties like shape fill, outline, and effects.
 */

// Define the base URL for the backend API
const API_BASE_URL = '/api/v1';

/**
 * Interface for shape properties
 */
export interface ShapeProperties {
  fill?: string;
  outline?: string;
  outlineWidth?: number;
  effects?: {
    shadow?: string;
    blur?: number;
    opacity?: number;
  };
}

/**
 * Fetches shape properties from the backend.
 * @param shapeId The ID of the shape to fetch properties for.
 * @returns A promise that resolves to the shape properties.
 */
export const getShapeProperties = async (shapeId: string): Promise<ShapeProperties> => {
  try {
    const response = await fetch(`${API_BASE_URL}/shapes/${shapeId}/properties`);
    if (!response.ok) {
      throw new Error('Failed to fetch shape properties');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching shape properties:', error);
    throw error;
  }
};

/**
 * Updates shape properties on the backend.
 * @param shapeId The ID of the shape to update.
 * @param properties The new properties to apply.
 * @returns A promise that resolves when the update is complete.
 */
export const updateShapeProperties = async (shapeId: string, properties: ShapeProperties): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/shapes/${shapeId}/properties`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(properties),
    });
    if (!response.ok) {
      throw new Error('Failed to update shape properties');
    }
  } catch (error) {
    console.error('Error updating shape properties:', error);
    throw error;
  }
};

/**
 * Saves the entire presentation to the backend.
 * @param presentationData The presentation data to save.
 * @returns A promise that resolves when the save is complete.
 */
export const savePresentation = async (presentationData: any): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/presentations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(presentationData),
    });
    if (!response.ok) {
      throw new Error('Failed to save presentation');
    }
  } catch (error) {
    console.error('Error saving presentation:', error);
    throw error;
  }
};
