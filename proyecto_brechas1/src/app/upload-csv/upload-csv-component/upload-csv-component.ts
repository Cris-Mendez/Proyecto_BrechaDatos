import { Component, OnInit, Inject, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { DataService } from '../../services/data-service';
import { ApiService } from '../../services/api.service';
import { HttpEvent, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MapaComponent } from "../../components/mapa/mapa";
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart, registerables, LegendItem } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-upload-csv',
  standalone: true,
  imports: [CommonModule, FormsModule, MapaComponent, BaseChartDirective],
  templateUrl: './upload-csv-component.html',
  styleUrls: ['./upload-csv-component.css']
})
export class UploadCsvComponent implements OnInit {
  selectedFile: File | null = null;
  progress = 0;
  isConnected = false;
  connectionMessage = '';

  apiData: any[] = [];
  colombiaPopulation: any[] = [];
  totalResultados = 0;

  isLoading = false;
  activeTab: string = 'upload';
  selectedTopicId: string = '1';
  isBrowser = false;

  isUploading = false; // nueva bandera

  /** 🔑 NUEVO: controla la visibilidad del botón "Ir a Prioridad" */
  csvLoaded = false;

  // === NUEVO: control de tabla API ===
  showAllPopulation = false;     // mostrar todos los registros o solo 18
  populationLoaded = false;      // para ocultar botón de "Cargar datos..."
  get displayedPopulation() {
    return this.showAllPopulation
      ? this.colombiaPopulation
      : this.colombiaPopulation.slice(0, 18);
  }

  // checkboxes del comparativo
  showCsv = true;
  showApi = true;

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  @ViewChild('legendBar', { static: false }) legendBarRef?: ElementRef<HTMLUListElement>;
  chartPlugins: any[] = [];

  // ====== GRÁFICA PRINCIPAL ======
  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: ["Sin datos aún"],
    datasets: [
      {
        data: [0],
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
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    layout: { padding: 0 },
    elements: { point: { radius: 2, hitRadius: 10, hoverRadius: 4 } },
    scales: {
      x: { grid: { display: false } },
      y: { ticks: { precision: 0 } }
    }
  };

  // ====== COMPARATIVO ======
  private readonly PER_PEOPLE = 500;

  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      { label: 'CSV/DB (Colombia)', data: [], backgroundColor: 'rgba(54, 162, 235, 0.7)' },
      { label: 'API (Colombia)',    data: [], backgroundColor: 'rgba(255, 99, 132, 0.7)' }
    ]
  };

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    animations: { colors: false, active: { duration: 0 }, resize: { duration: 0 }, tension: { duration: 0 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
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
    private dataService: DataService,
    private apiService: ApiService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.chartPlugins = [this.htmlLegendPlugin()];

    this.apiService.connectionStatus$.subscribe(status => {
      this.isConnected = status;
      this.connectionMessage = status
        ? 'Conexión establecida correctamente con la API'
        : 'No se pudo conectar a la API';
    });

    this.loadChartDataFromDB();
    // No marcamos populationLoaded aquí; se marcará cuando realmente cargue
  }

  goToPriorizacion() { this.router.navigate(['/priorizacion']); }

  onFileSelected(event: Event) {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      this.selectedFile = element.files[0];
    }
  }

  onUpload() {
    if (!this.selectedFile) {
      alert("⚠ Selecciona un archivo primero.");
      return;
    }

    // 🔒 Oculta el botón mientras se sube y procesa
    this.csvLoaded = false;
    this.isUploading = true;

    this.dataService.uploadCsv(this.selectedFile).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          const rows = typeof event.body === 'string'
            ? event.body.split('\n')
            : (event.body as string[]);

          this.procesarCsv(rows);

          // ✅ Mostrar el botón: CSV ya procesado
          this.csvLoaded = (this.lineChartData.labels?.length ?? 0) > 0;

          alert("Archivo subido correctamente.");
          this.progress = 0;
          this.isUploading = false;

          this.loadChartDataFromDB();
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error("❌ Error al subir:", err.message);
        alert("Error al subir archivo CSV");
        this.progress = 0;
        this.isUploading = false;
        // Mantener oculto si falló
        this.csvLoaded = false;
      }
    });
  }

  checkAPIConnection(): void {
    this.isLoading = true;
    this.apiService.testConnection().subscribe({
      next: () => {
        this.isLoading = false;
        this.activeTab = 'api';
        alert('Conexión con la API exitosa.');
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Error conectando a API:', err);
        alert('Error al conectar con la API.');
      }
    });
  }

  fetchAPIData(): void {
    if (!this.isConnected) {
      alert('Primero debe establecer conexión con la API');
      return;
    }

    this.isLoading = true;
    this.apiService.searchIndicators("poverty").subscribe({
      next: (data: any) => {
        this.apiData = data.value || [];
        this.totalResultados = data['@odata.count'] || this.apiData.length;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error obteniendo datos:', err);
        alert('Error al obtener datos de la API');
        this.isLoading = false;
      }
    });
  }

  // === CARGA DE POBLACIÓN (tabla API) ===
  fetchColombiaPopulation(): void {
    this.isLoading = true;
    this.apiService.getColombiaPopulation().subscribe({
      next: (data: any) => {
        let raw = [];
        if (data?.data && Array.isArray(data.data)) raw = data.data;
        else if (data?.value && Array.isArray(data.value)) raw = data.value;
        else if (Array.isArray(data)) raw = data;

        this.colombiaPopulation = raw.map((d: any) => ({
          TIME_PERIOD: d.TIME_PERIOD ?? d.time_period ?? d.Year ?? null,
          REF_AREA: d.REF_AREA ?? d.countryCode ?? d.Country ?? null,
          OBS_VALUE: d.OBS_VALUE ?? d.obs_value ?? d.Value ?? null,
          UNIT_MEASURE: d.UNIT_MEASURE ?? d.unit_measure ?? d.Unit ?? null,
          SEX: d.SEX ?? d.sex ?? d.sexLabel ?? 'N/A',
          AGE: d.AGE ?? d.age ?? d.ageLabel ?? 'N/A',
          URBANISATION: d.URBANISATION ?? d.urbanisation ?? d.urbanisationLabel ?? 'N/A'
        }));

        // Estado UI tabla
        this.populationLoaded = true;
        this.showAllPopulation = false; // arrancar mostrando 18
        this.isLoading = false;

        // Actualizar comparativa (usa población para normalizar)
        this.updateBarChart();
      },
      error: (err: any) => {
        console.error('❌ Error obteniendo población de Colombia:', err);
        this.isLoading = false;
        // aunque falle, armamos comparativa con lo que haya
        this.updateBarChart();
      }
    });
  }

  togglePopulationView(): void {
    this.showAllPopulation = !this.showAllPopulation;
  }

  setActiveTab(tab: string): void { this.activeTab = tab; }

  private procesarCsv(rows: string[]): void {
    const labels: string[] = [];
    const values: number[] = [];

    rows.forEach((row, i) => {
      if (!row.trim()) return;
      const cols = row.split(',');
      if (i === 0) return; // encabezado

      labels.push(cols[0]);
      values.push(Number(cols[1]) || 0);
    });

    this.lineChartData = {
      labels,
      datasets: [
        { ...this.lineChartData.datasets[0], data: values }
      ]
    };

    this.chart?.update();
    this.updateBarChart();
  }

  private loadChartDataFromDB(): void {
    this.dataService.getObservations().subscribe({
      next: (data) => {
        if (!data || data.length === 0) return;

        const years = Array.from(new Set(data.map(d => d.timePeriod))).sort();

        const indicatorsMap = new Map<string, number[]>();
        data.forEach(d => {
          if (!indicatorsMap.has(d.indicatorName)) {
            indicatorsMap.set(d.indicatorName, Array(years.length).fill(0));
          }
          const index = years.indexOf(d.timePeriod);
          indicatorsMap.get(d.indicatorName)![index] = d.obsValue;
        });

        const datasets = Array.from(indicatorsMap.entries()).map(([name, values], i) => ({
          label: name,
          data: values,
          fill: false,
          borderColor: this.getColor(i),
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4
        }));

        this.lineChartData = { labels: years, datasets };
        this.chart?.update();

        // 🟢 Si ya hay datos en DB, considera el CSV como “cargado”
        if ((years?.length ?? 0) > 0) {
          this.csvLoaded = true;
        }

        this.updateBarChart();
      },
      error: (err) => console.error('Error cargando datos de DB:', err)
    });
  }

  private getColor(index: number): string {
    const colors = [
      '#3e95cd', '#8e5ea2', '#3cba9f', '#e8c3b9', '#c45850',
      '#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0',
      '#9966ff', '#ff9f40', '#2ecc71', '#e74c3c'
    ];
    return colors[index % colors.length];
  }

  private htmlLegendPlugin() {
    const plugin = {
      id: 'htmlLegend',
      afterUpdate: (chart: any) => {
        const ul = this.legendBarRef?.nativeElement;
        if (!ul) return;

        while (ul.firstChild) ul.firstChild.remove();

        const items: LegendItem[] = chart.options.plugins.legend.labels.generateLabels(chart);

        items.forEach((item) => {
          const li = document.createElement('li');
          const isVisible = chart.isDatasetVisible(item.datasetIndex!);
          li.classList.toggle('legend-item--hidden', !isVisible);

          const ds = chart.data.datasets[item.datasetIndex!];
          const color = Array.isArray(ds.borderColor)
            ? (ds.borderColor[0] as string)
            : ((ds.borderColor as string) || (item.strokeStyle as string) || '#888');

          const sw = document.createElement('span');
          sw.classList.add('legend-swatch');
          sw.style.background = color;

          const text = document.createElement('span');
          text.textContent = item.text;

          li.appendChild(sw);
          li.appendChild(text);

          li.onclick = () => {
            const visible = chart.isDatasetVisible(item.datasetIndex!);
            chart.setDatasetVisibility(item.datasetIndex!, !visible);
            li.classList.toggle('legend-item--hidden', visible);
            chart.update();
          };

          ul.appendChild(li);
        });
      }
    };
    return plugin;
  }

  private updateBarChart(): void {
    const csvYears = (this.lineChartData.labels as string[]) || [];
    const csvValues = (this.lineChartData.datasets[0]?.data as number[]) || [];

    const apiYears = this.colombiaPopulation.map(d => String(d.TIME_PERIOD));
    const apiRaw   = this.colombiaPopulation.map(d => Number(d.OBS_VALUE) || 0);

    const popByYear = new Map<string, number>();
    this.colombiaPopulation.forEach(d => {
      const y = String(d.TIME_PERIOD);
      const p = Number(d.OBS_VALUE) || 0;
      if (y) popByYear.set(y, p);
    });

    const allYears = Array.from(new Set([...csvYears, ...apiYears])).sort();

    const csvPerN = allYears.map(year => {
      const idx = csvYears.indexOf(year);
      const raw = idx >= 0 ? (Number(csvValues[idx]) || 0) : 0;
      const pop = popByYear.get(year) || 0;
      return pop > 0 ? (raw / pop) * this.PER_PEOPLE : raw;
    });

    const apiPerN = allYears.map(year => {
      const idx = apiYears.indexOf(year);
      const raw = idx >= 0 ? (Number(apiRaw[idx]) || 0) : 0;
      const pop = popByYear.get(year) || 0;
      return pop > 0 ? (raw / pop) * this.PER_PEOPLE : raw;
    });

    this.barChartData = {
      labels: allYears,
      datasets: [
        { ...this.barChartData.datasets[0], data: csvPerN, hidden: !this.showCsv },
        { ...this.barChartData.datasets[1], data: apiPerN, hidden: !this.showApi }
      ]
    };
  }

  applyCompareVisibility(): void {
    this.barChartData = {
      ...this.barChartData,
      datasets: [
        { ...this.barChartData.datasets[0], hidden: !this.showCsv },
        { ...this.barChartData.datasets[1], hidden: !this.showApi }
      ]
    };
  }
}
