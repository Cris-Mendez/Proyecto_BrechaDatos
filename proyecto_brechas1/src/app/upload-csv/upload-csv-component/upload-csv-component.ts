// Importaciones principales de Angular y utilidades
import { Component, OnInit, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { DataService } from '../../services/data-service';
import { ApiService } from '../../services/api.service';
import { HttpEvent, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MapaComponent } from "../../components/mapa/mapa";
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart, registerables } from 'chart.js';

// Registro de todos los componentes/plugins de Chart.js necesarios
Chart.register(...registerables);

@Component({
  selector: 'app-upload-csv',                 // selector del componente
  standalone: true,                           // componente standalone (sin módulo)
  imports: [CommonModule, FormsModule, MapaComponent, BaseChartDirective], // módulos y componentes usados
  templateUrl: './upload-csv-component.html', // template asociado
  styleUrls: ['./upload-csv-component.css']   // estilos asociados
})
export class UploadCsvComponent implements OnInit {
  // ======= ESTADO GENERAL / UI =======
  selectedFile: File | null = null; // archivo CSV seleccionado
  progress = 0;                     // progreso de subida (0-100)
  isConnected = false;              // estado de conexión a la API
  connectionMessage = '';           // mensaje de estado de la API

  // Datos y contadores
  apiData: any[] = [];              // resultados de búsquedas API (genérico)
  colombiaPopulation: any[] = [];   // datos de población obtenidos por API
  totalResultados = 0;              // total devuelto por API

  isLoading = false;                // bandera de carga (peticiones)
  activeTab: string = 'upload';     // pestaña activa: 'upload' | 'api'
  selectedTopicId: string = '1';    // ejemplo de selector de tópico (no usado aquí)
  isBrowser = false;                // true si corre en navegador (no SSR)

  isUploading = false;              // bandera mientras se sube CSV

  /** CTRL del botón "Ir a Prioridad" */
  csvLoaded = false;                // se activará cuando existan datos (para habilitar navegación)

  // ======= TABLA API (colombiaPopulation) =======
  showAllPopulation = false;        // alterna vista completa o recortada
  populationLoaded = false;         // indica si ya se cargó población
  get displayedPopulation() {       // getter para paginar/recortar a 18
    return this.showAllPopulation ? this.colombiaPopulation : this.colombiaPopulation.slice(0, 18);
  }

  // ======= COMPARATIVO (barras) =======
  showCsv = true;                   // mostrar serie CSV/DB en comparativo
  showApi = true;                   // mostrar serie API en comparativo

  /** Referencias a los gráficos (ng2-charts) para poder invocar update() */
  @ViewChild('lineChart') lineChart?: BaseChartDirective;
  @ViewChild('barChart')  barChart?: BaseChartDirective;

  // ====== CONFIGURACIÓN GRÁFICO DE LÍNEAS ======
  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: ["Sin datos aún"],      // etiquetas iniciales
    datasets: [
      {
        data: [0],                  // serie inicial
        label: 'Valores CSV/DB',
        fill: false,
        borderColor: 'blue',
        backgroundColor: 'rgba(30,136,229,0.15)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4
      }
    ]
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,                           // responsive
    maintainAspectRatio: false,                 // permite controlar alto por CSS
    interaction: { mode: 'nearest', intersect: false }, // interacción del hover
    plugins: { legend: { display: false }, tooltip: { enabled: true } }, // leyenda oculta (usamos propia)
    layout: { padding: 0 },
    elements: { point: { radius: 2, hitRadius: 10, hoverRadius: 4 } },
    scales: { x: { grid: { display: false } }, y: { ticks: { precision: 0 } } }
  };

  // ====== CONFIGURACIÓN GRÁFICO DE BARRAS (COMPARATIVO) ======
  private readonly PER_PEOPLE = 500; // normalización: por cada 500 habitantes

  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],                     // años combinados (CSV/API)
    datasets: [
      { label: 'CSV/DB (Colombia)', data: [], backgroundColor: 'rgba(54, 162, 235, 0.7)' },
      { label: 'API (Colombia)',    data: [], backgroundColor: 'rgba(255, 99, 132, 0.7)' }
    ]
  };

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,               // sin animaciones para rendimiento
    animations: { colors: false, active: { duration: 0 }, resize: { duration: 0 }, tension: { duration: 0 } },
    interaction: { mode: 'index', intersect: false }, // tooltip por índice (ambas barras)
    plugins: {
      legend: { display: false },   // leyenda propia arriba de la tarjeta
      tooltip: {
        enabled: true,
        callbacks: {
          // Personaliza el texto del tooltip con la normalización PER_PEOPLE
          label: (ctx) => {
            const v = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
            return `${ctx.dataset.label}: ${v.toFixed(2)} por cada ${this.PER_PEOPLE} hab.`;
          }
        }
      }
    },
    layout: { padding: { bottom: 24, top: 4, left: 4, right: 4 } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { minRotation: 45, maxRotation: 45, autoSkip: true, padding: 8 },
        // aumenta altura del eje X para que no se recorten labels rotadas
        afterFit: (scale: any) => { scale.height = scale.height + 16; }
      },
      y: {
        beginAtZero: true,
        ticks: { callback: (value) => `${Number(value).toFixed(0)}` },
        title: { display: true, text: `Por cada ${this.PER_PEOPLE} habitantes` }
      }
    }
  };

  constructor(
    private dataService: DataService, // servicio propio para CSV/DB
    private apiService: ApiService,   // servicio para llamadas a API externa
    private router: Router,           // navegación
    @Inject(PLATFORM_ID) private platformId: Object // detectar plataforma
  ) {}

  // Ciclo de vida: al iniciar el componente
  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId); // evita ejecutar gráficos en SSR

    // Suscripción al estado de conexión a la API (observable del servicio)
    this.apiService.connectionStatus$.subscribe(status => {
      this.isConnected = status;
      this.connectionMessage = status
        ? 'Conexión establecida correctamente con la API'
        : 'No se pudo conectar a la API';
    });

    // Cargar datos para el gráfico de líneas desde DB (si existen)
    this.loadChartDataFromDB();
  }

  /* ======= LEYENDA (gráfico de líneas): manejo de clic / teclado ======= */

  // Click con ratón sobre el ítem de leyenda (admite modificadores Alt/Shift)
  onLegendClickMouse(index: number, ev: Event): void {
    const me = ev as MouseEvent;
    this.toggleLegend(index, !!me.altKey, !!me.shiftKey);
  }
  // Accesibilidad: Enter/Espacio hacen toggle, admiten Alt/Shift
  onLegendClickKey(index: number, ev: Event): void {
    const ke = ev as KeyboardEvent;
    ke.preventDefault(); // evita que Space haga scroll
    this.toggleLegend(index, !!ke.altKey, !!ke.shiftKey);
  }
  // Lógica de toggle: Alt = mostrar todas; Shift = mostrar solo una; normal = alternar una
  private toggleLegend(index: number, alt: boolean, shift: boolean): void {
    if (!this.lineChart) return;
    if (alt) {
      this.lineChartData.datasets.forEach(ds => (ds.hidden = false));
    } else if (shift) {
      this.lineChartData.datasets.forEach((ds, i) => (ds.hidden = i !== index));
    } else {
      const hidden = this.lineChartData.datasets[index].hidden === true;
      this.lineChartData.datasets[index].hidden = !hidden;
    }
    this.lineChart.update(); // refresca el gráfico
  }

  /* ======= LEYENDA (gráfico de líneas): hover para resaltar serie ======= */
  private highlightIndex: number | null = null; // índice resaltado (o null)

  // Al entrar el mouse en el ítem → resaltar esa serie
  onLegendHoverEnter(index: number): void {
    this.highlightIndex = index;
    this.applyHighlightStyles();
  }
  // Al salir el mouse → restaurar estilos
  onLegendHoverLeave(): void {
    this.highlightIndex = null;
    this.applyHighlightStyles(); // restaura
  }

  // Aplica estilos de resaltado/atenuación según highlightIndex
  private applyHighlightStyles(): void {
    if (!this.lineChart) return;
    const hi = this.highlightIndex;

    (this.lineChartData.datasets as any[]).forEach((ds, i) => {
      // Guarda estilos originales una vez
      if (!ds.__orig) {
        ds.__orig = {
          borderColor: ds.borderColor,
          borderWidth: ds.borderWidth ?? 2,
          pointRadius: ds.pointRadius ?? 0
        };
      }
      if (hi === null || ds.hidden === true) {
        // Restaurar originales si no hay highlight o la serie está oculta
        ds.borderColor = ds.__orig.borderColor;
        ds.borderWidth = ds.__orig.borderWidth;
        ds.pointRadius = ds.__orig.pointRadius;
      } else if (i === hi) {
        // Serie resaltada: más gruesa y con puntos más visibles
        ds.borderColor = ds.__orig.borderColor;
        ds.borderWidth = Math.max(3, ds.__orig.borderWidth);
        ds.pointRadius = Math.max(3, ds.__orig.pointRadius);
      } else {
        // Otras series: atenuar (misma tonalidad con alpha menor)
        ds.borderColor = this.withAlpha(ds.__orig.borderColor, 0.2);
        ds.borderWidth = Math.max(1, Math.floor(ds.__orig.borderWidth * 0.7));
        ds.pointRadius = 0;
      }
    });

    this.lineChart.update(); // refrescar
  }

  /** Convierte '#rrggbb' o 'rgb/rgba(...)' a 'rgba(r,g,b,a)' con alpha dado */
  private withAlpha(color: string, alpha: number): string {
    if (!color) return `rgba(136,136,136,${alpha})`;
    // Si es hex #rrggbb
    const hex = color.startsWith('#') ? color.substring(1) : null;
    if (hex && (hex.length === 6)) {
      const r = parseInt(hex.slice(0,2), 16);
      const g = parseInt(hex.slice(2,4), 16);
      const b = parseInt(hex.slice(4,6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    // Si ya es rgb/rgba(...)
    if (color.startsWith('rgb')) {
      const nums = color.replace(/rgba?\(/,'').replace(')','').split(',').map(n=>Number(n.trim()));
      const [r,g,b] = nums;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    // Fallback neutro
    return `rgba(136,136,136,${alpha})`;
  }

  // Devuelve el color de la serie (para pintar el swatch de la leyenda)
  getDatasetColor(i: number): string {
    const ds = this.lineChartData.datasets[i] as any;
    const c = Array.isArray(ds.borderColor) ? ds.borderColor[0] : ds.borderColor;
    return c || '#888';
  }

  /* ======= Acciones varias ======= */

  // Navega a la pantalla de priorización
  goToPriorizacion() { this.router.navigate(['/priorizacion']); }

  // Captura el archivo seleccionado desde el input[type=file]
  onFileSelected(event: Event) {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) this.selectedFile = element.files[0];
  }

  // Envía el CSV al backend y procesa la respuesta
  onUpload() {
    if (!this.selectedFile) { alert("⚠ Selecciona un archivo primero."); return; }

    this.csvLoaded = false;   // resetea bandera
    this.isUploading = true;  // muestra estado de subida

    this.dataService.uploadCsv(this.selectedFile).subscribe({
      next: (event: HttpEvent<any>) => {
        // Progreso de carga
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress = Math.round((100 * event.loaded) / event.total);
        // Respuesta final del servidor (CSV procesado)
        } else if (event.type === HttpEventType.Response) {
          const rows = typeof event.body === 'string' ? event.body.split('\n') : (event.body as string[]);
          this.procesarCsv(rows); // pasa las filas para graficar
          this.csvLoaded = (this.lineChartData.labels?.length ?? 0) > 0; // habilita botón de priorización
          alert("Archivo subido correctamente.");
          this.progress = 0;
          this.isUploading = false;
          this.loadChartDataFromDB(); // recarga datos persistidos por si aplica
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error("❌ Error al subir:", err.message);
        alert("Error al subir archivo CSV");
        this.progress = 0;
        this.isUploading = false;
        this.csvLoaded = false;
      }
    });
  }

  // Prueba de conexión a la API (cambia pestaña a 'api' si OK)
  checkAPIConnection(): void {
    this.isLoading = true;
    this.apiService.testConnection().subscribe({
      next: () => { this.isLoading = false; this.activeTab = 'api'; alert('Conexión con la API exitosa.'); },
      error: (err: any) => { this.isLoading = false; console.error('Error conectando a API:', err); alert('Error al conectar con la API.'); }
    });
  }

  // Ejemplo de consulta a la API (no usada en la UI de población)
  fetchAPIData(): void {
    if (!this.isConnected) { alert('Primero debe establecer conexión con la API'); return; }
    this.isLoading = true;
    this.apiService.searchIndicators("poverty").subscribe({
      next: (data: any) => { this.apiData = data.value || []; this.totalResultados = data['@odata.count'] || this.apiData.length; this.isLoading = false; },
      error: (err: any) => { console.error('Error obteniendo datos:', err); alert('Error al obtener datos de la API'); this.isLoading = false; }
    });
  }

  // Llama a la API para traer población de Colombia, normaliza y actualiza comparativo
  fetchColombiaPopulation(): void {
    this.isLoading = true;
    this.apiService.getColombiaPopulation().subscribe({
      next: (data: any) => {
        // Normaliza el payload según forma (data, value o array plano)
        let raw: any[] = [];
        if (data?.data && Array.isArray(data.data)) raw = data.data;
        else if (data?.value && Array.isArray(data.value)) raw = data.value;
        else if (Array.isArray(data)) raw = data;

        // Mapea a un formato uniforme usado por la tabla y el comparativo
        this.colombiaPopulation = raw.map((d: any) => ({
          TIME_PERIOD: d.TIME_PERIOD ?? d.time_period ?? d.Year ?? null,
          REF_AREA: d.REF_AREA ?? d.countryCode ?? d.Country ?? null,
          OBS_VALUE: d.OBS_VALUE ?? d.obs_value ?? d.Value ?? null,
          UNIT_MEASURE: d.UNIT_MEASURE ?? d.unit_measure ?? d.Unit ?? null,
          SEX: d.SEX ?? d.sex ?? d.sexLabel ?? 'N/A',
          AGE: d.AGE ?? d.age ?? d.ageLabel ?? 'N/A',
          URBANISATION: d.URBANISATION ?? d.urbanisation ?? d.urbanisationLabel ?? 'N/A'
        }));

        this.populationLoaded = true;   // ya hay población en memoria
        this.showAllPopulation = false; // vuelve a vista recortada
        this.isLoading = false;

        this.updateBarChart();          // recalcula comparativo
      },
      error: (err: any) => {
        console.error('❌ Error obteniendo población de Colombia:', err);
        this.isLoading = false;
        this.updateBarChart();          // aunque falle, intenta refrescar estados
      }
    });
  }

  // Alterna entre ver todos los registros de población o solo 18
  togglePopulationView(): void { this.showAllPopulation = !this.showAllPopulation; }

  // Cambia la pestaña activa
  setActiveTab(tab: string): void { this.activeTab = tab; }

  // Procesa el CSV subido: arma labels/values y refresca gráfico de líneas y comparativo
  private procesarCsv(rows: string[]): void {
    const labels: string[] = [];
    const values: number[] = [];

    rows.forEach((row, i) => {
      if (!row.trim()) return;         // ignora filas vacías
      const cols = row.split(',');     // separa por comas
      if (i === 0) return;             // salta encabezado

      labels.push(cols[0]);            // col 0 → etiqueta (p.ej., año)
      values.push(Number(cols[1]) || 0); // col 1 → valor numérico
    });

    // Reemplaza datasets manteniendo estilo inicial
    this.lineChartData = {
      labels,
      datasets: [
        { ...this.lineChartData.datasets[0], data: values, hidden: false }
      ]
    };

    this.lineChart?.update();          // actualiza gráfico de líneas
    this.applyHighlightStyles();       // re-aplica estilos por si hay hover activo
    this.updateBarChart();             // recalcula comparativo con nuevos datos
  }

  // Carga datos persistidos desde DB para el gráfico de líneas (agrupa por indicador)
  private loadChartDataFromDB(): void {
    this.dataService.getObservations().subscribe({
      next: (data) => {
        if (!data || data.length === 0) return;

        // Conjunto de años ordenados
        const years = Array.from(new Set(data.map(d => d.timePeriod))).sort();

        // Mapa indicador → arreglo de valores por año
        const indicatorsMap = new Map<string, number[]>();
        data.forEach(d => {
          if (!indicatorsMap.has(d.indicatorName)) indicatorsMap.set(d.indicatorName, Array(years.length).fill(0));
          const index = years.indexOf(d.timePeriod);
          indicatorsMap.get(d.indicatorName)![index] = d.obsValue;
        });

        // Crea un dataset por indicador con colores cíclicos
        const datasets = Array.from(indicatorsMap.entries()).map(([name, values], i) => ({
          label: name,
          data: values,
          fill: false,
          borderColor: this.getColor(i),
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          hidden: false
        }));

        // Aplica al gráfico de líneas
        this.lineChartData = { labels: years, datasets };
        this.lineChart?.update();
        this.applyHighlightStyles();

        // Si hay años, marcamos que hay CSV "cargado" (habilita ir a priorización)
        if ((years?.length ?? 0) > 0) this.csvLoaded = true;

        // Recalcula comparativo
        this.updateBarChart();
      },
      error: (err) => console.error('Error cargando datos de DB:', err)
    });
  }

  // Paleta fija para asignar colores a series
  private getColor(index: number): string {
    const colors = [
      '#3e95cd', '#8e5ea2', '#3cba9f', '#e8c3b9', '#c45850',
      '#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0',
      '#9966ff', '#ff9f40', '#2ecc71', '#e74c3c'
    ];
    return colors[index % colors.length];
  }

  // Recalcula datos del gráfico de barras comparativo (CSV vs API) normalizados
  private updateBarChart(): void {
    // Años y valores del CSV (primer dataset del lineChartData)
    const csvYears = (this.lineChartData.labels as string[]) || [];
    const csvValues = (this.lineChartData.datasets[0]?.data as number[]) || [];

    // Años y valores crudos de la API (población)
    const apiYears = this.colombiaPopulation.map(d => String(d.TIME_PERIOD));
    const apiRaw   = this.colombiaPopulation.map(d => Number(d.OBS_VALUE) || 0);

    // Mapa año → población (para normalización)
    const popByYear = new Map<string, number>();
    this.colombiaPopulation.forEach(d => {
      const y = String(d.TIME_PERIOD);
      const p = Number(d.OBS_VALUE) || 0;
      if (y) popByYear.set(y, p);
    });

    // Unión ordenada de todos los años presentes
    const allYears = Array.from(new Set([...csvYears, ...apiYears])).sort();

    // Serie CSV normalizada por población (por PER_PEOPLE) cuando exista población
    const csvPerN = allYears.map(year => {
      const idx = csvYears.indexOf(year);
      const raw = idx >= 0 ? (Number(csvValues[idx]) || 0) : 0;
      const pop = popByYear.get(year) || 0;
      return pop > 0 ? (raw / pop) * this.PER_PEOPLE : raw;
    });

    // Serie API normalizada (mismo criterio)
    const apiPerN = allYears.map(year => {
      const idx = apiYears.indexOf(year);
      const raw = idx >= 0 ? (Number(apiRaw[idx]) || 0) : 0;
      const pop = popByYear.get(year) || 0;
      return pop > 0 ? (raw / pop) * this.PER_PEOPLE : raw;
    });

    // Actualiza el dataset de barras conservando estilos y visibilidad
    this.barChartData = {
      labels: allYears,
      datasets: [
        { ...this.barChartData.datasets[0], data: csvPerN, hidden: !this.showCsv },
        { ...this.barChartData.datasets[1], data: apiPerN, hidden: !this.showApi }
      ]
    };

    this.barChart?.update(); // refresca gráfico de barras
  }

  // Aplica visibilidad de los datasets del comparativo según checkboxes
  applyCompareVisibility(): void {
    this.barChartData = {
      ...this.barChartData,
      datasets: [
        { ...this.barChartData.datasets[0], hidden: !this.showCsv },
        { ...this.barChartData.datasets[1], hidden: !this.showApi }
      ]
    };
    this.barChart?.update();
  }
}
