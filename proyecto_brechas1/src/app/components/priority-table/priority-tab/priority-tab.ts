import { Component, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrioritizationService, PriorityRegion } from '../../../services/prioritization-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-priority-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './priority-tab.html',
  styleUrls: ['./priority-tab.css']
})
export class PriorityTabComponent {
  // ================================
  // VARIABLES DEL FILTRO Y DATOS
  // ================================
  priorityRegions: PriorityRegion[] = []; // Lista de regiones priorizadas
  availableIndicators: string[] = [];     // Lista de indicadores disponibles
  availableAges: string[] = [];           // Lista de edades disponibles

  selectedIndicator: string = ''; // Indicador seleccionado
  selectedAge: string = '';       // Edad seleccionada

  minYear: number = 2010; // Año inicial (filtro)
  maxYear: number = 2025; // Año final (filtro)
  isLoading: boolean = false; // Estado de carga
  errorMessage: string = '';  // Mensajes de error
  isDarkMode: boolean = false; // Modo oscuro/ligero
  today: Date = new Date();    // Fecha actual

  // Control ver más/menos en la tabla
  visibleCount: number = 10;
  isExpanded: boolean = false;

  // Estado de exportación a CSV
  isExporting: boolean = false;

  constructor(
    private prioritizationService: PrioritizationService, // Servicio para obtener datos
    private renderer: Renderer2,                          // Renderer2 para manipular DOM de forma segura
    private router: Router                                // Router para navegación
  ) {}

  ngOnInit(): void {
    // Cargar indicadores y edades disponibles
    this.loadAvailableIndicators();
    this.loadAvailableAges();

    // Detectar si el body tiene modo oscuro activo
    this.isDarkMode = document.body.classList.contains('dark-mode');

    // Observar cambios de clases en el body para actualizar el flag de tema
    const observer = new MutationObserver(() => {
      this.isDarkMode = document.body.classList.contains('dark-mode');
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Actualizar la fecha automáticamente cada minuto
    setInterval(() => { this.today = new Date(); }, 60000);
  }

  // ====== Navegación: Salir / Volver ======
  goBack(): void {
    // Si hay historial, regresar
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    // Si no hay historial, navegar a la pantalla de carga de CSV
    this.router.navigateByUrl('/upload-csv');
  }

  // ================================
  // CARGAR LISTA DE INDICADORES
  // ================================
  loadAvailableIndicators(): void {
    this.prioritizationService.getAvailableIndicators().subscribe({
      next: (indicators) => {
        this.availableIndicators = indicators;
        if (indicators.length > 0) {
          this.selectedIndicator = indicators[0]; // Selecciona el primero por defecto
          this.loadPriorityRegions();             // Carga regiones priorizadas con ese indicador
        }
      },
      error: (error) => {
        console.error('Error loading indicators:', error);
      }
    });
  }

  // ================================
  // CARGAR LISTA DE EDADES
  // ================================
  loadAvailableAges(): void {
    this.prioritizationService.getAvailableAges().subscribe({
      next: (ages) => {
        this.availableAges = ages;
        if (ages.length > 0) {
          this.selectedAge = ages[0]; // Selecciona la primera edad por defecto
        }
      },
      error: (error) => {
        console.error('Error loading ages:', error);
      }
    });
  }

  // ================================
  // CARGAR REGIONES PRIORIZADAS
  // ================================
  loadPriorityRegions(): void {
    if (!this.selectedIndicator) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.isExpanded = false; // Resetear expansión de tabla

    this.prioritizationService.getPriorityRegions(
      this.selectedIndicator,
      this.minYear,
      this.maxYear,
      this.selectedAge
    ).subscribe({
      next: (data) => {
        this.priorityRegions = data; // Guardar resultados
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar los datos de priorización';
        this.isLoading = false;
        console.error('Error:', error);
      }
    });
  }

  // EVENTO: CAMBIO DE INDICADOR
  onIndicatorChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedIndicator = select.value;
    this.loadPriorityRegions();
  }

  // EVENTO: CAMBIO DE EDAD
  onAgeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedAge = select.value;
    this.loadPriorityRegions();
  }

  // EVENTO: CAMBIO DE RANGO DE AÑOS
  onYearRangeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.id === 'minYear') {
      this.minYear = Number(input.value);
    } else if (input.id === 'maxYear') {
      this.maxYear = Number(input.value);
    }
    this.loadPriorityRegions();
  }

  // Devuelve la clase CSS según el score de prioridad
  getPriorityClass(score: number): string {
    if (score > 0.7) return 'high-priority';
    if (score > 0.4) return 'medium-priority';
    return 'low-priority';
  }

  // Devuelve la clase CSS de la tabla según el tema
  getTableThemeClass(): string {
    return this.isDarkMode ? 'table-dark' : 'table-light';
  }

  // Alternar expansión/plegado de filas
  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }

  // Devuelve las filas actualmente visibles (según expansión o límite)
  private getDisplayedRegions(): PriorityRegion[] {
    return this.isExpanded ? this.priorityRegions : this.priorityRegions.slice(0, this.visibleCount);
  }

  // ================================
  // UTILIDADES PARA EXPORTACIÓN CSV
  // ================================

  // Sanitiza el nombre del archivo (quita caracteres inválidos)
  private sanitizeFilename(name: string): string {
    return (name || 'indicador')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^\w\-\.]/g, '');
  }

  // Convierte valores a string con 2 decimales
  private toFixed2(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value as number)) return '';
    return (value as number).toFixed(2);
  }

  // Escapa valores con comillas o saltos de línea para CSV
  private csvEscape(val: string | number): string {
    let s = (val ?? '').toString();
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  // ⭐ Exportar datos a un archivo CSV descargable
  downloadCSV(): void {
    if (this.isLoading || this.priorityRegions.length === 0) return;

    try {
      this.isExporting = true;

      const rows = this.priorityRegions.slice(); // Copia de todas las filas

      // Encabezados de la tabla
      const headers = [
        'Prioridad',
        'País',
        'Código',
        'Valor Actual',
        'Tasa de Crecimiento',
        'Score de Prioridad',
        'Año más reciente'
      ];

      const lines: string[] = [];
      lines.push(headers.join(','));

      // Agregar filas al CSV
      rows.forEach((region, idx) => {
        const row = [
          (idx + 1).toString(),
          this.csvEscape(region.countryName),
          this.csvEscape(region.countryCode),
          this.toFixed2(region.currentValue),
          this.csvEscape(this.toFixed2(region.growthRate) + '%'),
          this.toFixed2(region.priorityScore),
          (region.latestYear ?? '').toString()
        ];
        lines.push(row.join(','));
      });

      // Contenido del CSV (con BOM para compatibilidad con Excel)
      const csvContent = '\uFEFF' + lines.join('\n');

      // Nombre de archivo amigable
      const indicatorSafe = this.sanitizeFilename(this.selectedIndicator);
      const ageSafe = this.sanitizeFilename(this.selectedAge);
      const filename = `prioridades_${indicatorSafe}_${ageSafe}_${this.minYear}-${this.maxYear}_all.csv`;

      // Crear blob y disparar descarga
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      // Limpiar elementos temporales
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error al exportar CSV:', e);
      this.errorMessage = 'No se pudo descargar el CSV. Inténtalo de nuevo.';
    } finally {
      this.isExporting = false;
    }
  }
}
