/* src/app/tab2/tab2.page.ts */
import { Component, OnInit, inject, signal, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonContent, IonSearchbar } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
import { UniversalSearchComponent, EventCardData } from '../../components/universal-search/universal-search.component';
import { ShowEventComponent } from '../../components/show-event/show-event.component';
import { SearchStateService } from '../../services/search-state.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonContent, IonSearchbar, UniversalSearchComponent, ShowEventComponent],
})
export class Tab2Page implements OnInit, AfterViewInit {
  private readonly API_BASE = environment.apiBase;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private searchState = inject(SearchStateService);
  private langService = inject(LanguageService);

  t = this.langService.getTranslations('zh').tab2;
  eventsData = signal<EventCardData[]>([]);
  currentType: string | null = null;
  @ViewChild('searchBar') searchBar!: IonSearchbar;

  ngOnInit() {
    this.langService.currentLang$.subscribe((lang: 'zh' | 'en') => {
      this.t = this.langService.getTranslations(lang).tab2;
    });
    this.route.queryParams.subscribe(params => {
      this.currentType = params['type'] || null;
      this.loadEvents(params['search'] || '');
    });
  }

  ionViewWillEnter() {
    this.loadEvents();
  }

  filterByType(type: 'request' | 'help' | null) {
    if (this.currentType === type) {
      this.currentType = null;
      this.router.navigate([], { relativeTo: this.route, queryParams: { type: null }, queryParamsHandling: 'merge' });
    } else {
      this.currentType = type;
      this.router.navigate([], { relativeTo: this.route, queryParams: { type }, queryParamsHandling: 'merge' });
    }
    this.loadEvents();
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe(params => {
      if (params['focusSearch']) setTimeout(() => this.searchBar?.setFocus(), 300);
    });
  }

  private loadEvents(keyword?: string) {
    const lang = this.langService.getCurrentLang();
    const realType = this.currentType || this.route.snapshot.queryParams['type'] || null;
    const params = new URLSearchParams();
    if (keyword) params.append('search', encodeURIComponent(keyword));
    if (realType) params.append('type', realType);
    params.append('lang', lang);

    fetch(`${this.API_BASE}/api/cards?${params.toString()}`)
      .then(res => res.json())
      .then(list => {
        const transformed = list.map((item: any) => ({
          id: String(item.id),
          creatorId: Number(item.creatorId),
          cardImage: item.cardImage,
          title: item.title,
          icon: item.icon || 'navigate-outline',
          distance: item.distance || this.t.unknownDistance,
          name: item.name,
          address: item.address,
          demand: item.demand,
          price: item.price ? String(item.price) : '0.00',
          createTime: item.createTime,
          avatar: item.avatar,
        }));
        this.eventsData.set(transformed);
      })
      .catch(err => console.error(this.t.loadFailed, err));
  }

  onTypeChange(type: 'request' | 'help' | null) {
    this.currentType = type;
    this.router.navigate([], { relativeTo: this.route, queryParams: { type }, queryParamsHandling: 'merge' });
    this.loadEvents();
  }

  navigateToSearch() {
    this.router.navigate(['/search'], { queryParams: { returnTo: 'tabs/tab2' } });
  }
}