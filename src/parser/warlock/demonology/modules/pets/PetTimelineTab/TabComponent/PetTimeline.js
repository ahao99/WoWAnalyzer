import React from 'react';
import PropTypes from 'prop-types';
import GeminiScrollbar from 'react-gemini-scrollbar';
import ReactTooltip from 'react-tooltip';
import 'gemini-scrollbar/gemini-scrollbar.css';

import 'parser/shared/modules/features/TimelineTab/TabComponent/SpellTimeline.css';
import DeathEvents from 'parser/shared/modules/features/TimelineTab/TabComponent/DeathEvents';

import { formatDuration } from 'common/format';
import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';

import PetRow from './PetRow';
import KeyCastsRow from './KeyCastsRow';
import './PetTimeline.css';
import PETS from '../../PET_INFO';

const NETHER_PORTAL_DURATION = 20000;
const NEARBY_CASTS_BUFFER = 250;
const NEARBY_CAST_COUNT = 3;

class PetTimeline extends React.PureComponent {
  static propTypes = {
    start: PropTypes.number.isRequired,
    end: PropTypes.number.isRequired,
    deaths: PropTypes.array.isRequired,
    resurrections: PropTypes.array.isRequired,
    petTimeline: PropTypes.object,
    historyBySpellId: PropTypes.object,
  };

  constructor() {
    super();
    this.handleMouseWheel = this.handleMouseWheel.bind(this);
    this.state = {
      zoom: 2,
    };
  }

  handleMouseWheel(e) {
    // This translate vertical scrolling into horizontal scrolling
    if (!this.gemini || !this.gemini.scrollbar) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (e.detail > 0) {
      // noinspection JSSuspiciousNameCombination
      this.gemini.scrollbar._viewElement.scrollLeft -= e.deltaY;
    } else {
      // noinspection JSSuspiciousNameCombination
      this.gemini.scrollbar._viewElement.scrollLeft += e.deltaY;
    }
  }

  componentDidMount() {
    this.componentDidUpdate();
  }

  componentDidUpdate() {
    ReactTooltip.rebuild();
  }

  get pets() {
    const { petTimeline } = this.props;
    return petTimeline.groupPetsBySummonAbility();
  }

  get keyEvents() {
    // shows important events in first row - Tyrant, Implosion, Nether Portal cast and duration, casts during Nether Portal
    let events = this.importantEvents;
    events = this.decorateCloseCasts(events);
    events = this.decorateImplosionCasts(events);
    console.log(events);
    return events;
  }

  get importantEvents() {
    const { historyBySpellId } = this.props;
    // these casts are extracted manually with flag "important"
    const manualCastIds = [SPELLS.SUMMON_DEMONIC_TYRANT.id, SPELLS.IMPLOSION_CAST.id, SPELLS.NETHER_PORTAL_TALENT.id];
    const tyrantCasts = this.filterHistoryCasts(SPELLS.SUMMON_DEMONIC_TYRANT.id);
    const implosionCasts = this.filterHistoryCasts(SPELLS.IMPLOSION_CAST.id);
    const netherPortalCasts = this.filterHistoryCasts(SPELLS.NETHER_PORTAL_TALENT.id);
    const netherPortalWindows = netherPortalCasts.map(cast => ({
      type: 'duration',
      timestamp: cast.timestamp,
      endTimestamp: cast.timestamp + NETHER_PORTAL_DURATION,
    }));
    const castsDuringNetherPortal = [];
    if (netherPortalCasts.length > 0) {
      // iterate through all spells
      Object.keys(historyBySpellId)
        .filter(key => !manualCastIds.includes(Number(key))) // filter out casts we got manually
        .map(key => historyBySpellId[key])
        .forEach(historyArray => {
          // filter casts and only those, that fall into any Nether Portal window
          const casts = historyArray
            .filter(event => event.type === 'cast'
              && netherPortalWindows.some(window => window.timestamp <= event.timestamp
                && event.timestamp <= window.endTimestamp))
            .map(event => ({
              type: 'cast',
              timestamp: event.timestamp,
              abilityId: event.ability.guid,
              abilityName: event.ability.name,
            }));
          castsDuringNetherPortal.push(...casts);
        });
    }
    return [
      ...tyrantCasts,
      ...implosionCasts,
      ...netherPortalCasts,
      ...netherPortalWindows,
      ...castsDuringNetherPortal,
    ].sort((event1, event2) => event1.timestamp - event2.timestamp);
  }

  decorateCloseCasts(events) {
    // iterate through each cast, look if there are another casts very nearby, if so, save their names
    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      if (event.type !== 'cast') {
        continue;
      }
      // check N surrounding casts on both sides, if they are within BUFFER, save their names
      const minI = Math.max(i - NEARBY_CAST_COUNT, 0);
      const maxI = Math.min(i + NEARBY_CAST_COUNT, events.length - 1);
      const leftLimit = event.timestamp - NEARBY_CASTS_BUFFER;
      const rightLimit = event.timestamp + NEARBY_CASTS_BUFFER;
      for (let j = minI; j <= maxI; j += 1) {
        if (j === i || events[j].type !== 'cast') {
          continue;
        }
        if (leftLimit <= events[j].timestamp && events[j].timestamp <= rightLimit) {
          event.nearbyCasts = event.nearbyCasts || [];
          event.nearbyCasts.push(events[j].abilityName);
        }
      }
    }
    return events;
  }

  decorateImplosionCasts(events) {
    const { petTimeline } = this.props;
    events.filter(event => event.type === 'cast' && event.abilityId === SPELLS.IMPLOSION_CAST.id)
      .forEach(cast => {
        const impCount = petTimeline.getPetsAtTimestamp(cast.timestamp).filter(pet => pet.guid === PETS.WILD_IMP_HOG.guid || pet.guid === PETS.WILD_IMP_INNER_DEMONS.guid).length;
        cast.extraInfo = `Imploded ${impCount} Wild Imp${impCount > 1 ? 's' : ''}`;
      });
    return events;
  }

  filterHistoryCasts(id) {
    const { historyBySpellId } = this.props;
    return historyBySpellId[id]
      .filter(event => event.type === 'cast')
      .map(event => ({
        type: 'cast',
        important: true,
        timestamp: event.timestamp,
        abilityId: event.ability.guid,
        abilityName: event.ability.name,
      }));
  }

  gemini = null;
  render() {
    const { start, end, deaths, resurrections, ...others } = this.props;
    delete others.historyBySpellId;
    delete others.petTimeline;
    const pets = this.pets;
    const duration = end - start;
    const seconds = Math.ceil(duration / 1000);

    const secondWidth = 80 / this.state.zoom;
    const skipInterval = Math.ceil(40 / secondWidth);

    // 9 for the scrollbar height
    // 4 for margin
    // 36 for the ruler
    // 28 for each timeline row
    const rows = Object.keys(pets).length + 1; // +1 for key events
    const totalHeight = 9 + 4 + 36 + 28 * rows;
    const totalWidth = seconds * secondWidth;

    const tyrantCastTimestamps = pets[SPELLS.SUMMON_DEMONIC_TYRANT.id].pets.map(pet => pet.spawn);

    return (
      <div className="spell-timeline flex" {...others}>
        <div className="flex-sub legend">
          <div className="lane ruler-lane">
            <div className="btn-group">
              {[1, 1.5, 2, 2.5, 3, 5].map(zoom => (
                <button key={zoom} className={`btn btn-default btn-xs ${zoom === this.state.zoom ? 'active' : ''}`} onClick={() => this.setState({ zoom })}>{zoom}x</button>
              ))}
            </div>
          </div>
          <div className="lane" key="casts">
            Key casts
          </div>
          {Object.keys(pets).map(spellId => (
            <div className="lane" key={spellId}>
              {spellId !== 'unknown' && <SpellLink id={spellId} />}
              {spellId === 'unknown' && <dfn data-tip="Most likely a permanent pet">Unknown</dfn>}
            </div>
          ))}
        </div>
        <GeminiScrollbar
          className="timeline flex-main"
          style={{ height: totalHeight }}
          onWheel={this.handleMouseWheel}
          ref={comp => {
            this.gemini = comp;
          }}
        >
          <div className={`ruler interval-${skipInterval}`} style={{ width: totalWidth }}>
            {seconds > 0 && [...Array(seconds)].map((_, second) => {
              if (second % skipInterval !== 0) {
                // Skip every second second when the text width becomes larger than the container
                return null;
              }
              return (
                <div key={second} className="lane" style={{ width: secondWidth * skipInterval }}>
                  {formatDuration(second)}
                </div>
              );
            })}
          </div>
          <KeyCastsRow
            key="keyCastsRow"
            className="lane"
            events={this.keyEvents}
            start={start}
            totalWidth={totalWidth}
            secondWidth={secondWidth}
          />
          {Object.keys(pets).map(spellId => (
            <PetRow
              key={spellId}
              className="lane"
              tyrantCasts={tyrantCastTimestamps}
              pets={pets[spellId].pets}
              start={start}
              totalWidth={totalWidth}
              secondWidth={secondWidth}
            />
          ))}
          <DeathEvents
            start={start}
            secondWidth={secondWidth}
            deaths={deaths}
            resurrections={resurrections}
            invalidated={deaths.length + resurrections.length}
          />
        </GeminiScrollbar>
      </div>
    );
  }
}

export default PetTimeline;
