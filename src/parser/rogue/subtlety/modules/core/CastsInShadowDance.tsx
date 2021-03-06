import React from 'react';
import SPELLS from 'common/SPELLS';
import SpellIcon from 'common/SpellIcon';
import { formatPercentage } from 'common/format';
import STATISTIC_CATEGORY from 'interface/others/STATISTIC_CATEGORY';
import Statistic from 'interface/statistics/Statistic';
import BoringValueText from 'interface/statistics/components/BoringValueText';
import { Options } from 'parser/core/Analyzer';
import Spell from 'common/SPELLS/Spell';
import { When } from 'parser/core/ParseResults';

import DamageTracker from 'parser/shared/modules/AbilityTracker';

import CastsInStealthBase from './CastsInStealthBase';
import DanceDamageTracker from './DanceDamageTracker';


class CastsInShadowDance extends CastsInStealthBase {
  static dependencies = {
    damageTracker: DamageTracker,
    danceDamageTracker: DanceDamageTracker,
  };

  protected damageTracker!: DamageTracker;
  protected danceDamageTracker!: DanceDamageTracker;

  constructor(options: Options & { danceDamageTracker: DanceDamageTracker }) {
    super(options);

    this.maxCastsPerStealth = 5 + (this.selectedCombatant.hasTalent(SPELLS.SUBTERFUGE_TALENT.id) ? 1 : 0);

    this.stealthCondition = "Shadow Dance";

    options.danceDamageTracker.subscribeInefficientCast(
      this.badStealthSpells,
      (s: Spell) => `Cast Shadowstrike instead of ${s.name} when you are in ${this.stealthCondition} window`,
    );
  }

  get danceBackstabThresholds() {
    return this.createWrongCastThresholds(this.backstabSpell, this.danceDamageTracker);
  }

  suggestions(when: When) {
    this.suggestWrongCast(when, this.backstabSpell, this.danceBackstabThresholds);
    this.suggestAvgCasts(when, SPELLS.SHADOW_DANCE);
  }

  get stealthMaxCasts() {
    return this.maxCastsPerStealth * this.damageTracker.getAbility(SPELLS.SHADOW_DANCE.id).casts || 0;
  }
  get stealthActualCasts() {
    return this.validStealthSpellIds.map(s => this.danceDamageTracker.getAbility(s).casts || 0).reduce((p, c) => p + c);
  }

  statistic() {
    const shadowDanceUptime = this.selectedCombatant.getBuffUptime(SPELLS.SHADOW_DANCE_BUFF.id) / this.owner.fightDuration;
    return (
      <Statistic
        size="flexible"
        category={STATISTIC_CATEGORY.GENERAL}
      >
        <BoringValueText label={<><SpellIcon id={SPELLS.SHADOW_DANCE_BUFF.id} /> Shadow Dance Uptime </>}>
          {formatPercentage(shadowDanceUptime)} %
        </BoringValueText>
      </Statistic>
    );
  }
}

export default CastsInShadowDance;
