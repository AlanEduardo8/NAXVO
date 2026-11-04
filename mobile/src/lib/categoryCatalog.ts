import type { Category } from '@/types/api';

/** Catálogo visual local. No representa servicios publicados ni disponibilidad real. */
export const fallbackCategories: Category[] = [
  { slug: 'plomeria', name: 'Plomería', mark: '', description: 'Instalación y reparación de tuberías, fugas y sanitarios.' },
  { slug: 'electricidad', name: 'Electricidad', mark: '', description: 'Instalaciones, contactos, iluminación y mantenimiento eléctrico.' },
  { slug: 'carpinteria', name: 'Carpintería', mark: '', description: 'Muebles, puertas, ajustes y trabajos a medida.' },
  { slug: 'pintura', name: 'Pintura', mark: '', description: 'Pintura interior, exterior y acabados.' },
  { slug: 'jardineria', name: 'Jardinería', mark: '', description: 'Jardines, áreas verdes y mantenimiento.' },
  { slug: 'albanileria', name: 'Albañilería', mark: '', description: 'Construcción, reparación y remodelaciones.' },
  { slug: 'electrodomesticos', name: 'Electrodomésticos', mark: '', description: 'Diagnóstico y reparación de equipos del hogar.' },
  { slug: 'mantenimiento', name: 'Mantenimiento General', mark: '', description: 'Soluciones y reparaciones para el hogar y negocios.' },
];
