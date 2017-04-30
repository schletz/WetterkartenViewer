## Download von WGRIB2
AUf [http://www.ftp.cpc.ncep.noaa.gov/wd51we/wgrib2/Windows_XP/] kann die neueste wgrib2.exe samt allen
DLL dateien geladen werden.

## Download von CFSR Mean Dateien
Von [http://cfs.ncep.noaa.gov/cfsv2/downloads.html] können unter *Calibration Climatologies of CFSR Timeseries*
GRIB Dateien bezogen werden. 

Mit ´wgrib2.exe.v2.0.3 t850.cfsr.mean.clim.daily.1982.2010.grb2 -lon 16 48 -t > t850.csv` kann dann ein CSV
mit den Werten geschrieben werden.

## Download er gefilterten Grib Dateien
Von [http://nomads.ncep.noaa.gov] können gefilterte GRIB Dateien bezogen werden. 1 Request generiert
einen Ausschnitt aus einem Vorhersagezeitpunkt.

Folgender Request lädt für 48°NB und 16.25°ÖL die Ebenen surface, 2 m above ground, 10 m above ground, 0C isotherm, 
500 mb, 850 mb und 925 mb. Es werden die Parameter 5WAVH, CAPE, GUST, HGT, LFTX, PRATE, PRES, PRMSL
RH und TMP geladen. Eine Beschreibung gibt es auf [http://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_table4-2.shtml]

http://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?file=gfs.t00z.pgrb2.0p25.f000&lev_0C_isotherm=on&lev_10_m_above_ground=on&lev_2_m_above_ground=on&lev_500_mb=on&lev_700_mb=on&lev_850_mb=on&lev_925_mb=on&lev_surface=on&var_5WAVH=on&var_CAPE=on&var_GUST=on&var_HGT=on&var_LFTX=on&var_PRATE=on&var_PRES=on&var_PRMSL=on&var_RH=on&var_TMAX=on&var_TMIN=on&var_TMP=on&subregion=&leftlon=16.25&rightlon=16.25&toplat=48&bottomlat=48&dir=%2Fgfs.2017031800

EPOT und TEMPA (Theta E und Anomalie) kann nicht gewählt werden.

Mit `grib2json.cmd -n -d ..\..\gfs.t00z.pgrb2.0p25.f000  > test.txt` kann das GRIB in eine JSON
Datei mit Parameternamen (-n) geschrieben werden.

Es stehen 173 Vorhersagezeitpunkte und die Analyse zur Verfügung:
```
gfs.t00z.pgrb2.0p25.anl
gfs.t00z.pgrb2.0p25.f000
gfs.t00z.pgrb2.0p25.f001
gfs.t00z.pgrb2.0p25.f002
gfs.t00z.pgrb2.0p25.f003
gfs.t00z.pgrb2.0p25.f004
gfs.t00z.pgrb2.0p25.f005
gfs.t00z.pgrb2.0p25.f006
gfs.t00z.pgrb2.0p25.f007
gfs.t00z.pgrb2.0p25.f008
gfs.t00z.pgrb2.0p25.f009
gfs.t00z.pgrb2.0p25.f010
gfs.t00z.pgrb2.0p25.f011
gfs.t00z.pgrb2.0p25.f012
gfs.t00z.pgrb2.0p25.f013
gfs.t00z.pgrb2.0p25.f014
gfs.t00z.pgrb2.0p25.f015
gfs.t00z.pgrb2.0p25.f016
gfs.t00z.pgrb2.0p25.f017
gfs.t00z.pgrb2.0p25.f018
gfs.t00z.pgrb2.0p25.f019
gfs.t00z.pgrb2.0p25.f020
gfs.t00z.pgrb2.0p25.f021
gfs.t00z.pgrb2.0p25.f022
gfs.t00z.pgrb2.0p25.f023
gfs.t00z.pgrb2.0p25.f024
gfs.t00z.pgrb2.0p25.f025
gfs.t00z.pgrb2.0p25.f026
gfs.t00z.pgrb2.0p25.f027
gfs.t00z.pgrb2.0p25.f028
gfs.t00z.pgrb2.0p25.f029
gfs.t00z.pgrb2.0p25.f030
gfs.t00z.pgrb2.0p25.f031
gfs.t00z.pgrb2.0p25.f032
gfs.t00z.pgrb2.0p25.f033
gfs.t00z.pgrb2.0p25.f034
gfs.t00z.pgrb2.0p25.f035
gfs.t00z.pgrb2.0p25.f036
gfs.t00z.pgrb2.0p25.f037
gfs.t00z.pgrb2.0p25.f038
gfs.t00z.pgrb2.0p25.f039
gfs.t00z.pgrb2.0p25.f040
gfs.t00z.pgrb2.0p25.f041
gfs.t00z.pgrb2.0p25.f042
gfs.t00z.pgrb2.0p25.f043
gfs.t00z.pgrb2.0p25.f044
gfs.t00z.pgrb2.0p25.f045
gfs.t00z.pgrb2.0p25.f046
gfs.t00z.pgrb2.0p25.f047
gfs.t00z.pgrb2.0p25.f048
gfs.t00z.pgrb2.0p25.f049
gfs.t00z.pgrb2.0p25.f050
gfs.t00z.pgrb2.0p25.f051
gfs.t00z.pgrb2.0p25.f052
gfs.t00z.pgrb2.0p25.f053
gfs.t00z.pgrb2.0p25.f054
gfs.t00z.pgrb2.0p25.f055
gfs.t00z.pgrb2.0p25.f056
gfs.t00z.pgrb2.0p25.f057
gfs.t00z.pgrb2.0p25.f058
gfs.t00z.pgrb2.0p25.f059
gfs.t00z.pgrb2.0p25.f060
gfs.t00z.pgrb2.0p25.f061
gfs.t00z.pgrb2.0p25.f062
gfs.t00z.pgrb2.0p25.f063
gfs.t00z.pgrb2.0p25.f064
gfs.t00z.pgrb2.0p25.f065
gfs.t00z.pgrb2.0p25.f066
gfs.t00z.pgrb2.0p25.f067
gfs.t00z.pgrb2.0p25.f068
gfs.t00z.pgrb2.0p25.f069
gfs.t00z.pgrb2.0p25.f070
gfs.t00z.pgrb2.0p25.f071
gfs.t00z.pgrb2.0p25.f072
gfs.t00z.pgrb2.0p25.f073
gfs.t00z.pgrb2.0p25.f074
gfs.t00z.pgrb2.0p25.f075
gfs.t00z.pgrb2.0p25.f076
gfs.t00z.pgrb2.0p25.f077
gfs.t00z.pgrb2.0p25.f078
gfs.t00z.pgrb2.0p25.f079
gfs.t00z.pgrb2.0p25.f080
gfs.t00z.pgrb2.0p25.f081
gfs.t00z.pgrb2.0p25.f082
gfs.t00z.pgrb2.0p25.f083
gfs.t00z.pgrb2.0p25.f084
gfs.t00z.pgrb2.0p25.f085
gfs.t00z.pgrb2.0p25.f086
gfs.t00z.pgrb2.0p25.f087
gfs.t00z.pgrb2.0p25.f088
gfs.t00z.pgrb2.0p25.f089
gfs.t00z.pgrb2.0p25.f090
gfs.t00z.pgrb2.0p25.f091
gfs.t00z.pgrb2.0p25.f092
gfs.t00z.pgrb2.0p25.f093
gfs.t00z.pgrb2.0p25.f094
gfs.t00z.pgrb2.0p25.f095
gfs.t00z.pgrb2.0p25.f096
gfs.t00z.pgrb2.0p25.f097
gfs.t00z.pgrb2.0p25.f098
gfs.t00z.pgrb2.0p25.f099
gfs.t00z.pgrb2.0p25.f100
gfs.t00z.pgrb2.0p25.f101
gfs.t00z.pgrb2.0p25.f102
gfs.t00z.pgrb2.0p25.f103
gfs.t00z.pgrb2.0p25.f104
gfs.t00z.pgrb2.0p25.f105
gfs.t00z.pgrb2.0p25.f106
gfs.t00z.pgrb2.0p25.f107
gfs.t00z.pgrb2.0p25.f108
gfs.t00z.pgrb2.0p25.f109
gfs.t00z.pgrb2.0p25.f110
gfs.t00z.pgrb2.0p25.f111
gfs.t00z.pgrb2.0p25.f112
gfs.t00z.pgrb2.0p25.f113
gfs.t00z.pgrb2.0p25.f114
gfs.t00z.pgrb2.0p25.f115
gfs.t00z.pgrb2.0p25.f116
gfs.t00z.pgrb2.0p25.f117
gfs.t00z.pgrb2.0p25.f118
gfs.t00z.pgrb2.0p25.f119
gfs.t00z.pgrb2.0p25.f120
gfs.t00z.pgrb2.0p25.f123
gfs.t00z.pgrb2.0p25.f126
gfs.t00z.pgrb2.0p25.f129
gfs.t00z.pgrb2.0p25.f132
gfs.t00z.pgrb2.0p25.f135
gfs.t00z.pgrb2.0p25.f138
gfs.t00z.pgrb2.0p25.f141
gfs.t00z.pgrb2.0p25.f144
gfs.t00z.pgrb2.0p25.f147
gfs.t00z.pgrb2.0p25.f150
gfs.t00z.pgrb2.0p25.f153
gfs.t00z.pgrb2.0p25.f156
gfs.t00z.pgrb2.0p25.f159
gfs.t00z.pgrb2.0p25.f162
gfs.t00z.pgrb2.0p25.f165
gfs.t00z.pgrb2.0p25.f168
gfs.t00z.pgrb2.0p25.f171
gfs.t00z.pgrb2.0p25.f174
gfs.t00z.pgrb2.0p25.f177
gfs.t00z.pgrb2.0p25.f180
gfs.t00z.pgrb2.0p25.f183
gfs.t00z.pgrb2.0p25.f186
gfs.t00z.pgrb2.0p25.f189
gfs.t00z.pgrb2.0p25.f192
gfs.t00z.pgrb2.0p25.f195
gfs.t00z.pgrb2.0p25.f198
gfs.t00z.pgrb2.0p25.f201
gfs.t00z.pgrb2.0p25.f204
gfs.t00z.pgrb2.0p25.f207
gfs.t00z.pgrb2.0p25.f210
gfs.t00z.pgrb2.0p25.f213
gfs.t00z.pgrb2.0p25.f216
gfs.t00z.pgrb2.0p25.f219
gfs.t00z.pgrb2.0p25.f222
gfs.t00z.pgrb2.0p25.f225
gfs.t00z.pgrb2.0p25.f228
gfs.t00z.pgrb2.0p25.f231
gfs.t00z.pgrb2.0p25.f234
gfs.t00z.pgrb2.0p25.f237
gfs.t00z.pgrb2.0p25.f240
gfs.t00z.pgrb2.0p25.f252
gfs.t00z.pgrb2.0p25.f264
gfs.t00z.pgrb2.0p25.f276
gfs.t00z.pgrb2.0p25.f288
gfs.t00z.pgrb2.0p25.f300
gfs.t00z.pgrb2.0p25.f312
gfs.t00z.pgrb2.0p25.f324
gfs.t00z.pgrb2.0p25.f336
gfs.t00z.pgrb2.0p25.f348
gfs.t00z.pgrb2.0p25.f360
gfs.t00z.pgrb2.0p25.f372
gfs.t00z.pgrb2.0p25.f384
```