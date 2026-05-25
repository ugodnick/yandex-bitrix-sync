import crypto from 'crypto';
import { YandexFleetDriverProfile } from './yandex-fleet-profile.type';
import { YandexFleetVehicleData } from '../vehicle/yandex-fleet-vehicle.type';

export function calculateDriverHash(
  driverProfile: YandexFleetDriverProfile,
  driverCar: YandexFleetVehicleData | undefined,
  bitrixStageId?: string,
): string {
  const person = driverProfile.person;
  const dl = driverProfile.person.driver_license;

  const cargo = driverCar?.cargo;
  const vehicleSpecifications = driverCar?.vehicle_specifications;
  const vehiclePark = driverCar?.park_profile;
  const vehicleLicenses = driverCar?.vehicle_licenses;

  const significantData = {
    phone: person.contact_info.phone,
    firstName: person.full_name.first_name,
    lastName: person.full_name.last_name,
    middleName: person.full_name.middle_name,
    employmentType: person.employment_type,
    address: person.contact_info?.address,
    comment: undefined,
    balanceLimit: driverProfile.account.balance_limit,
    dlNumber: dl?.number,
    dlIssueDate: dl?.issue_date,
    dlExpiryDate: dl?.expiry_date,
    dlBirthdate: dl?.birth_date,
    carBrand: vehicleSpecifications?.brand,
    carModel: vehicleSpecifications?.model,
    carYear: vehicleSpecifications?.year,
    carColor: vehicleSpecifications?.color,
    carTransmission: vehicleSpecifications?.transmission,
    carVin: vehicleSpecifications?.vin,
    licensePlate: vehicleLicenses?.licence_plate_number,
    registrationCert: vehicleLicenses?.registration_certificate,
    cargoLength: cargo?.cargo_hold_dimensions?.length,
    cargoHeight: cargo?.cargo_hold_dimensions?.height,
    cargoWidth: cargo?.cargo_hold_dimensions?.width,
    carryingCapacity: cargo?.carrying_capacity,
    fuelType: vehiclePark?.fuel_type,
    amenities: vehiclePark?.amenities ?? [],
    platform: driverProfile.order_provider.platform,
    partner: driverProfile.order_provider.partner,
    bitrixStageId,
  };

  return crypto.createHash('md5').update(JSON.stringify(significantData)).digest('hex');
}
