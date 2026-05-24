alter table chicken_adjustments drop constraint chicken_adjustments_type_check;
alter table chicken_adjustments add constraint chicken_adjustments_type_check check (type in ('addition', 'reduction', 'audit', 'sold'));
